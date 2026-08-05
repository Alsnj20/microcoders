//! CreditManager Contract
//!
//! Manages Memory Credits (MC) — the internal consumption unit
//! that funds AI processing.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, Uint};
use memorychain_common::{
    errors::{CommonError, CreditError},
    events::*,
};
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct CreditManager {
        mapping(address => CreditAccount) accounts;
        FeeConfig fees;
        address admin;
        mapping(address => bool) authorized_consumers;
    }

    pub struct CreditAccount {
        uint64 balance;
        uint64 purchased;
        uint64 spent;
    }

    pub struct FeeConfig {
        uint16 create_memory;
        uint16 update_memory;
        uint16 create_agent;
        uint16 update_agent;
        uint16 execute_agent;
    }
}

#[public]
impl CreditManager {
    /// Initializes the contract with default fees.
    pub fn initialize(&mut self) {
        if self.admin.get() == Address::ZERO {
            self.admin.set(self.vm().msg_sender());
            self.fees.create_memory.set(Uint::from(1u16));
            self.fees.update_memory.set(Uint::from(1u16));
            self.fees.create_agent.set(Uint::from(5u16));
            self.fees.update_agent.set(Uint::from(2u16));
            self.fees.execute_agent.set(Uint::from(2u16));
        }
    }

    /// Buys credits for the caller.
    pub fn buy_credits(&mut self, amount: u64) -> Result<(), String> {
        if amount == 0 {
            return Err(CreditError::ZeroAmount.into());
        }

        let caller = self.vm().msg_sender();
        let amount_uint = Uint::from(amount);

        let current_balance: Uint<64, 1> = self.accounts.getter(caller).balance.get();
        let current_purchased: Uint<64, 1> = self.accounts.getter(caller).purchased.get();

        let mut account = self.accounts.setter(caller);
        account.balance.set(current_balance + amount_uint);
        account.purchased.set(current_purchased + amount_uint);

        let new_balance = u64::try_from(current_balance + amount_uint).unwrap_or(0);
        self.vm().log(CreditsPurchased {
            user: caller,
            amount,
            new_balance,
        });

        Ok(())
    }

    /// Consumes credits from a user's account.
    /// Only callable by authorized consumer contracts.
    pub fn consume_credits(
        &mut self,
        user: Address,
        amount: u64,
    ) -> Result<bool, String> {
        let caller = self.vm().msg_sender();

        if !self.authorized_consumers.get(caller) {
            return Err(CreditError::UnauthorizedConsumer { caller }.into());
        }

        if amount == 0 {
            return Err(CreditError::ZeroAmount.into());
        }

        let balance: Uint<64, 1> = self.accounts.getter(user).balance.get();
        let amount_uint = Uint::from(amount);

        if balance < amount_uint {
            return Ok(false);
        }

        let spent: Uint<64, 1> = self.accounts.getter(user).spent.get();

        let mut account = self.accounts.setter(user);
        account.balance.set(balance - amount_uint);
        account.spent.set(spent + amount_uint);

        let new_balance = u64::try_from(balance - amount_uint).unwrap_or(0);
        self.vm().log(CreditsConsumed {
            user,
            amount,
            new_balance,
        });

        Ok(true)
    }

    /// Refunds credits to a user's account.
    pub fn refund_credits(
        &mut self,
        user: Address,
        amount: u64,
    ) -> Result<(), String> {
        let caller = self.vm().msg_sender();

        if caller != self.admin.get()
            && !self.authorized_consumers.get(caller)
        {
            return Err(CreditError::UnauthorizedConsumer { caller }.into());
        }

        if amount == 0 {
            return Err(CreditError::ZeroAmount.into());
        }

        let balance: Uint<64, 1> = self.accounts.getter(user).balance.get();
        let spent: Uint<64, 1> = self.accounts.getter(user).spent.get();
        let amount_uint = Uint::from(amount);

        let mut account = self.accounts.setter(user);
        account.balance.set(balance + amount_uint);

        if spent >= amount_uint {
            account.spent.set(spent - amount_uint);
        }

        let new_balance = u64::try_from(balance + amount_uint).unwrap_or(0);
        self.vm().log(CreditsRefunded {
            user,
            amount,
            new_balance,
        });

        Ok(())
    }

    /// Returns the credit balance of a user.
    pub fn balance_of(&self, user: Address) -> u64 {
        u64::try_from(self.accounts.getter(user).balance.get()).unwrap_or(0)
    }

    /// Returns the total purchased credits of a user.
    pub fn total_purchased(&self, user: Address) -> u64 {
        u64::try_from(self.accounts.getter(user).purchased.get()).unwrap_or(0)
    }

    /// Returns the total spent credits of a user.
    pub fn total_spent(&self, user: Address) -> u64 {
        u64::try_from(self.accounts.getter(user).spent.get()).unwrap_or(0)
    }

    /// Checks if a user has sufficient credits.
    pub fn has_sufficient_credits(&self, user: Address, amount: u64) -> bool {
        let balance: Uint<64, 1> = self.accounts.getter(user).balance.get();
        balance >= Uint::from(amount)
    }

    /// Returns the fee for a specific operation.
    pub fn get_fee(&self, operation: u8) -> u16 {
        let val: Uint<16, 1> = match operation {
            0 => self.fees.create_memory.get(),
            1 => self.fees.update_memory.get(),
            2 => self.fees.create_agent.get(),
            3 => self.fees.update_agent.get(),
            4 => self.fees.execute_agent.get(),
            _ => Uint::ZERO,
        };
        u16::try_from(val).unwrap_or(0)
    }

    /// Returns all configured fees.
    pub fn get_fees(&self) -> (u16, u16, u16, u16, u16) {
        (
            u16::try_from(self.fees.create_memory.get()).unwrap_or(0),
            u16::try_from(self.fees.update_memory.get()).unwrap_or(0),
            u16::try_from(self.fees.create_agent.get()).unwrap_or(0),
            u16::try_from(self.fees.update_agent.get()).unwrap_or(0),
            u16::try_from(self.fees.execute_agent.get()).unwrap_or(0),
        )
    }

    /// Updates fee configuration. Admin only.
    pub fn update_fees(
        &mut self,
        create_memory: u16,
        update_memory: u16,
        create_agent: u16,
        update_agent: u16,
        execute_agent: u16,
    ) -> Result<(), String> {
        let caller = self.vm().msg_sender();

        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        self.fees.create_memory.set(Uint::from(create_memory));
        self.fees.update_memory.set(Uint::from(update_memory));
        self.fees.create_agent.set(Uint::from(create_agent));
        self.fees.update_agent.set(Uint::from(update_agent));
        self.fees.execute_agent.set(Uint::from(execute_agent));

        self.vm().log(FeesUpdated {
            create_memory,
            update_memory,
            create_agent,
            update_agent,
            execute_agent,
        });

        Ok(())
    }

    /// Authorizes a contract to consume credits. Admin only.
    pub fn authorize_consumer(&mut self, consumer: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();

        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        self.authorized_consumers.setter(consumer).set(true);

        Ok(())
    }

    /// Revokes authorization from a consumer. Admin only.
    pub fn revoke_consumer(&mut self, consumer: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();

        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }

        self.authorized_consumers.setter(consumer).set(false);

        Ok(())
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

    fn setup() -> (TestVM, CreditManager) {
        let vm = TestVM::default();
        let mut contract = CreditManager::from(&vm);
        contract.initialize();
        (vm, contract)
    }

    #[test]
    fn test_initialize() {
        let (_vm, contract) = setup();
        assert_eq!(contract.admin(), DEFAULT_SENDER);
        assert_eq!(contract.get_fee(0), 1);  // create_memory
        assert_eq!(contract.get_fee(2), 5);  // create_agent
    }

    #[test]
    fn test_buy_credits() {
        let (_vm, mut contract) = setup();
        contract.buy_credits(100).unwrap();
        assert_eq!(contract.balance_of(DEFAULT_SENDER), 100);
        assert_eq!(contract.total_purchased(DEFAULT_SENDER), 100);
    }

    #[test]
    fn test_buy_credits_zero_fails() {
        let (_vm, mut contract) = setup();
        assert!(contract.buy_credits(0).is_err());
    }

    #[test]
    fn test_has_sufficient_credits() {
        let (_vm, mut contract) = setup();
        contract.buy_credits(10).unwrap();
        assert!(contract.has_sufficient_credits(DEFAULT_SENDER, 10));
        assert!(!contract.has_sufficient_credits(DEFAULT_SENDER, 11));
    }

    #[test]
    fn test_update_fees_admin_only() {
        let (_vm, mut contract) = setup();
        let result = contract.update_fees(2, 2, 10, 4, 4);
        assert!(result.is_ok());
        assert_eq!(contract.get_fee(0), 2);
    }
}
