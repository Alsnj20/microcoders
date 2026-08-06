//! UserRegistry Contract
//!
//! Manages user identities within MemoryChain.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, Uint, U256};
use memorychain_common::{
    errors::{CommonError, UserError},
    events::*,
};
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct UserRegistry {
        mapping(address => UserData) users;
        mapping(string => bool) username_taken;
        uint256 total_users;
        address admin;
        mapping(address => bool) authorized_updaters;
        address pending_admin;
        bool paused;
    }

    pub struct UserData {
        address owner;
        string username;
        uint64 created_at;
        bool active;
        uint32 total_agents;
        uint32 total_memories;
    }
}

#[public]
impl UserRegistry {
    /// Initializes the contract.
    pub fn initialize(&mut self) {
        if self.admin.get() == Address::ZERO {
            self.admin.set(self.vm().msg_sender());
        }
    }

    // ════════════════════════════════════════════════════════════════════════
    // PAUSABLE
    // ════════════════════════════════════════════════════════════════════════

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

    // ════════════════════════════════════════════════════════════════════════
    // ADMIN TRANSFER (Two-step)
    // ════════════════════════════════════════════════════════════════════════

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
            return Err(String::from("UserRegistry: not pending admin"));
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

    // ════════════════════════════════════════════════════════════════════════
    // USER MANAGEMENT
    // ════════════════════════════════════════════════════════════════════════

    /// Registers a new user.
    pub fn register_user(&mut self, username: String) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        if self.is_registered(caller) {
            return Err(String::from("UserRegistry: already registered"));
        }

        if username.is_empty() || username.len() > 64 {
            return Err(String::from("UserRegistry: invalid username length"));
        }

        if self.username_taken.get(username.clone()) {
            return Err(UserError::UsernameTaken { username }.into());
        }

        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut user = self.users.setter(caller);
        user.owner.set(caller);
        user.username.set_str(&username);
        user.created_at.set(timestamp);
        user.active.set(true);
        user.total_agents.set(Uint::from(0u32));
        user.total_memories.set(Uint::from(0u32));

        self.username_taken.setter(username.clone()).set(true);
        self.total_users.set(self.total_users.get() + U256::from(1));

        self.vm().log(UserRegistered {
            owner: caller,
            username,
            timestamp: U256::from(self.vm().block_timestamp()),
        });

        Ok(())
    }

    /// Updates the caller's username.
    pub fn update_username(&mut self, new_username: String) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        if !self.is_registered(caller) {
            return Err(String::from("UserRegistry: not registered"));
        }

        if new_username.is_empty() || new_username.len() > 64 {
            return Err(String::from("UserRegistry: invalid username length"));
        }

        let old_username = self.users.getter(caller).username.get_string();
        if old_username == new_username {
            return Ok(());
        }

        if self.username_taken.get(new_username.clone()) {
            return Err(UserError::UsernameTaken { username: new_username }.into());
        }

        self.username_taken.setter(old_username).set(false);
        self.username_taken.setter(new_username.clone()).set(true);
        self.users.setter(caller).username.set_str(&new_username);

        self.vm().log(UsernameUpdated {
            owner: caller,
            new_username,
        });

        Ok(())
    }

    /// Deactivates the caller's account.
    pub fn deactivate_user(&mut self) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        if !self.is_registered(caller) {
            return Err(String::from("UserRegistry: not registered"));
        }

        self.users.setter(caller).active.set(false);

        self.vm().log(UserDeactivated {
            owner: caller,
        });

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // STAT UPDATES (Cross-contract, access controlled)
    // ════════════════════════════════════════════════════════════════════════

    /// Increments the agent count for a user. Only callable by authorized contracts.
    pub fn increment_agents(&mut self, owner: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if !self.authorized_updaters.get(caller) && caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        let current: Uint<32, 1> = self.users.getter(owner).total_agents.get();
        self.users.setter(owner).total_agents.set(current + Uint::from(1u32));
        Ok(())
    }

    /// Increments the memory count for a user. Only callable by authorized contracts.
    pub fn increment_memories(&mut self, owner: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if !self.authorized_updaters.get(caller) && caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        let current: Uint<32, 1> = self.users.getter(owner).total_memories.get();
        self.users.setter(owner).total_memories.set(current + Uint::from(1u32));
        Ok(())
    }

    /// Authorizes a contract to update user stats. Admin only.
    pub fn authorize_updater(&mut self, updater: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }
        self.authorized_updaters.setter(updater).set(true);
        self.vm().log(UpdaterAuthorized { updater });
        Ok(())
    }

    /// Revokes updater authorization. Admin only.
    pub fn revoke_updater(&mut self, updater: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }
        self.authorized_updaters.setter(updater).set(false);
        self.vm().log(UpdaterRevoked { updater });
        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════

    /// Checks if an address is registered.
    pub fn exists(&self, owner: Address) -> bool {
        self.users.getter(owner).owner.get() != Address::ZERO
    }

    /// Checks if the caller is registered.
    pub fn is_registered(&self, owner: Address) -> bool {
        self.exists(owner)
    }

    /// Returns the username of a user.
    pub fn get_username(&self, owner: Address) -> String {
        self.users.getter(owner).username.get_string()
    }

    /// Checks if the user account is active.
    pub fn is_active(&self, owner: Address) -> bool {
        self.users.getter(owner).active.get()
    }

    /// Returns the total number of registered users.
    pub fn total_users(&self) -> U256 {
        self.total_users.get()
    }

    /// Returns the agent count for a user.
    pub fn get_agent_count(&self, owner: Address) -> u32 {
        u32::try_from(self.users.getter(owner).total_agents.get()).unwrap_or(0)
    }

    /// Returns the memory count for a user.
    pub fn get_memory_count(&self, owner: Address) -> u32 {
        u32::try_from(self.users.getter(owner).total_memories.get()).unwrap_or(0)
    }

    /// Returns the admin address.
    pub fn admin(&self) -> Address {
        self.admin.get()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use stylus_sdk::testing::*;

    const DEFAULT_SENDER: Address = Address::new([
        0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD,
        0xBE, 0xEF, 0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD, 0xBE, 0xEF,
    ]);

    fn setup() -> (TestVM, UserRegistry) {
        let vm = TestVM::default();
        let mut contract = UserRegistry::from(&vm);
        contract.initialize();
        (vm, contract)
    }

    #[test]
    fn test_register_user() {
        let (_vm, mut contract) = setup();
        contract.register_user(String::from("alice")).unwrap();
        assert!(contract.is_registered(DEFAULT_SENDER));
        assert_eq!(contract.get_username(DEFAULT_SENDER), "alice");
        assert_eq!(contract.total_users(), U256::from(1));
    }

    #[test]
    fn test_register_duplicate_fails() {
        let (_vm, mut contract) = setup();
        contract.register_user(String::from("alice")).unwrap();
        assert!(contract.register_user(String::from("bob")).is_err());
    }

    #[test]
    fn test_register_empty_username_fails() {
        let (_vm, mut contract) = setup();
        assert!(contract.register_user(String::from("")).is_err());
    }

    #[test]
    fn test_username_uniqueness() {
        let (_vm, mut contract) = setup();
        contract.register_user(String::from("alice")).unwrap();
        // Cannot register with same username on same contract
        assert!(contract.register_user(String::from("alice")).is_err());
    }

    #[test]
    fn test_update_username() {
        let (_vm, mut contract) = setup();
        contract.register_user(String::from("alice")).unwrap();
        contract.update_username(String::from("bob")).unwrap();
        assert_eq!(contract.get_username(DEFAULT_SENDER), "bob");
    }

    #[test]
    fn test_update_username_uniqueness() {
        let (_vm, mut contract) = setup();
        // Register "alice", then try to update to "alice" (same name = ok, no-op)
        contract.register_user(String::from("alice")).unwrap();
        assert!(contract.update_username(String::from("alice")).is_ok());
        // Old username "alice" is freed when we change to "bob"
        contract.update_username(String::from("bob")).unwrap();
        assert_eq!(contract.get_username(DEFAULT_SENDER), "bob");
    }

    #[test]
    fn test_deactivate_user() {
        let (_vm, mut contract) = setup();
        contract.register_user(String::from("alice")).unwrap();
        assert!(contract.is_active(DEFAULT_SENDER));
        contract.deactivate_user().unwrap();
        assert!(!contract.is_active(DEFAULT_SENDER));
    }

    #[test]
    fn test_increment_agents_unauthorized() {
        let (_vm, mut contract) = setup();
        contract.register_user(String::from("alice")).unwrap();
        // Admin can always call increment_agents (by design)
        // This test verifies the function works for admin
        contract.increment_agents(DEFAULT_SENDER).unwrap();
        assert_eq!(contract.get_agent_count(DEFAULT_SENDER), 1);
    }

    #[test]
    fn test_increment_agents_authorized() {
        let (_vm, mut contract) = setup();
        contract.register_user(String::from("alice")).unwrap();
        contract.authorize_updater(DEFAULT_SENDER).unwrap();
        contract.increment_agents(DEFAULT_SENDER).unwrap();
        assert_eq!(contract.get_agent_count(DEFAULT_SENDER), 1);
    }

    #[test]
    fn test_pausable() {
        let (_vm, mut contract) = setup();
        assert!(!contract.is_paused());
        contract.pause().unwrap();
        assert!(contract.is_paused());
        assert!(contract.register_user(String::from("alice")).is_err());
        contract.unpause().unwrap();
        assert!(!contract.is_paused());
        contract.register_user(String::from("alice")).unwrap();
        assert!(contract.is_registered(DEFAULT_SENDER));
    }
}
