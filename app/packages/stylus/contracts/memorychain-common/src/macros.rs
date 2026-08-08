//! Macros for common contract patterns (Pausable, AdminTransfer).
//!
//! These macros reduce code duplication across contracts by generating
//! the boilerplate for pausable and admin transfer functionality.

/// Generates pausable functionality: pause(), unpause(), is_paused(), require_not_paused()
///
/// Requires: `admin` and `paused` fields in the contract struct,
/// and imports of `CommonError`, `ContractPaused`, `ContractUnpaused`.
#[macro_export]
macro_rules! impl_pausable {
    () => {
        /// Pauses the contract. Admin only.
        pub fn pause(&mut self) -> Result<(), String> {
            let caller = self.vm().msg_sender();
            if caller != self.admin.get() {
                return Err(CommonError::NotAdmin { caller }.into());
            }
            self.paused.set(true);
            self.vm().log(ContractPaused { admin: caller });
            Ok(())
        }

        /// Unpauses the contract. Admin only.
        pub fn unpause(&mut self) -> Result<(), String> {
            let caller = self.vm().msg_sender();
            if caller != self.admin.get() {
                return Err(CommonError::NotAdmin { caller }.into());
            }
            self.paused.set(false);
            self.vm().log(ContractUnpaused { admin: caller });
            Ok(())
        }

        /// Returns whether the contract is paused.
        pub fn is_paused(&self) -> bool {
            self.paused.get()
        }

        fn require_not_paused(&self) -> Result<(), String> {
            if self.paused.get() {
                return Err(CommonError::Paused.into());
            }
            Ok(())
        }
    };
}

/// Generates admin transfer functionality: propose_admin(), accept_admin(), pending_admin()
///
/// Requires: `admin` and `pending_admin` fields in the contract struct,
/// and imports of `CommonError`, `AdminTransferProposed`, `AdminTransferCompleted`.
#[macro_export]
macro_rules! impl_admin_transfer {
    () => {
        /// Proposes a new admin. Current admin only.
        pub fn propose_admin(&mut self, new_admin: Address) -> Result<(), String> {
            let caller = self.vm().msg_sender();
            if caller != self.admin.get() {
                return Err(CommonError::NotAdmin { caller }.into());
            }
            if new_admin == Address::ZERO {
                return Err(CommonError::InvalidInput { reason: "new admin cannot be zero address" }.into());
            }
            self.pending_admin.set(new_admin);
            self.vm().log(AdminTransferProposed {
                current_admin: caller,
                new_admin,
            });
            Ok(())
        }

        /// Accepts admin role. Called by the proposed admin.
        pub fn accept_admin(&mut self) -> Result<(), String> {
            let caller = self.vm().msg_sender();
            let pending = self.pending_admin.get();
            if caller != pending {
                return Err(CommonError::NotAdmin { caller }.into());
            }
            let old_admin = self.admin.get();
            self.admin.set(caller);
            self.pending_admin.set(Address::ZERO);
            self.vm().log(AdminTransferCompleted {
                old_admin,
                new_admin: caller,
            });
            Ok(())
        }

        /// Returns the pending admin address.
        pub fn pending_admin(&self) -> Address {
            self.pending_admin.get()
        }
    };
}
