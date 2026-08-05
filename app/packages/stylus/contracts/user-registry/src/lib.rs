//! UserRegistry Contract
//!
//! Manages user identities within MemoryChain.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, Uint, U256};
use memorychain_common::events::*;
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct UserRegistry {
        mapping(address => UserData) users;
        uint256 total_users;
        address admin;
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

    /// Registers a new user.
    pub fn register_user(&mut self, username: String) -> Result<(), String> {
        let caller = self.vm().msg_sender();

        if self.is_registered(caller) {
            return Err(String::from("UserRegistry: already registered"));
        }

        if username.is_empty() || username.len() > 64 {
            return Err(String::from("UserRegistry: invalid username length"));
        }

        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut user = self.users.setter(caller);
        user.owner.set(caller);
        user.username.set_str(&username);
        user.created_at.set(timestamp);
        user.active.set(true);
        user.total_agents.set(Uint::from(0u32));
        user.total_memories.set(Uint::from(0u32));

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
        let caller = self.vm().msg_sender();

        if !self.is_registered(caller) {
            return Err(String::from("UserRegistry: not registered"));
        }

        if new_username.is_empty() || new_username.len() > 64 {
            return Err(String::from("UserRegistry: invalid username length"));
        }

        self.users.setter(caller).username.set_str(&new_username);

        self.vm().log(UsernameUpdated {
            owner: caller,
            new_username,
        });

        Ok(())
    }

    /// Deactivates the caller's account.
    pub fn deactivate_user(&mut self) -> Result<(), String> {
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

    /// Increments the agent count for a user.
    pub fn increment_agents(&mut self, owner: Address) {
        let current: Uint<32, 1> = self.users.getter(owner).total_agents.get();
        self.users.setter(owner).total_agents.set(current + Uint::from(1u32));
    }

    /// Increments the memory count for a user.
    pub fn increment_memories(&mut self, owner: Address) {
        let current: Uint<32, 1> = self.users.getter(owner).total_memories.get();
        self.users.setter(owner).total_memories.set(current + Uint::from(1u32));
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
    fn test_update_username() {
        let (_vm, mut contract) = setup();
        contract.register_user(String::from("alice")).unwrap();
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
}
