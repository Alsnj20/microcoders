//! ChatRegistry Contract
//!
//! Manages user chat conversations on-chain.
//! Metadata (messages) lives in IPFS; only CID, hash, and name are stored on-chain.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, FixedBytes, Uint, U256};
use memorychain_common::{
    errors::{ChatError, CommonError},
    events::*,
    helpers::generate_id,
    impl_admin_transfer, impl_pausable,
    interfaces::{ICreditManager, IUserRegistry},
    types::{ResourceStatus, OP_CREATE_CHAT, OP_UPDATE_CHAT},
};
use stylus_core::calls::Call;
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct ChatRegistry {
        mapping(bytes32 => Chat) chats;
        mapping(address => mapping(uint256 => bytes32)) owner_chats;
        mapping(address => uint256) owner_chat_count;
        uint256 total_chats;
        address credit_manager;
        address user_registry;
        mapping(address => uint256) nonces;
        address admin;
        address pending_admin;
        bool paused;
    }

    pub struct Chat {
        bytes32 chat_id;
        address owner;
        uint32 latest_version;
        string current_cid;
        bytes32 current_hash;
        string name;
        uint8 status;
        uint64 created_at;
        uint64 updated_at;
    }
}

#[public]
impl ChatRegistry {
    /// Initializes the contract with CreditManager and UserRegistry addresses.
    pub fn initialize(&mut self, credit_manager: Address, user_registry: Address) -> Result<(), String> {
        if self.admin.get() != Address::ZERO {
            return Err(String::from("ChatRegistry: already initialized"));
        }
        if credit_manager == Address::ZERO || user_registry == Address::ZERO {
            return Err(String::from("ChatRegistry: zero address provided"));
        }

        let caller = self.vm().msg_sender();
        self.admin.set(caller);
        self.credit_manager.set(credit_manager);
        self.user_registry.set(user_registry);

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // PAUSABLE
    // ════════════════════════════════════════════════════════════════════════
    impl_pausable!();

    // ════════════════════════════════════════════════════════════════════════
    // ADMIN TRANSFER (Two-step)
    // ════════════════════════════════════════════════════════════════════════
    impl_admin_transfer!();

    // ════════════════════════════════════════════════════════════════════════
    // UPGRADEABILITY SETTERS
    // ════════════════════════════════════════════════════════════════════════

    /// Updates the CreditManager address. Admin only.
    pub fn set_credit_manager(&mut self, new_address: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }
        if new_address == Address::ZERO {
            return Err(CommonError::InvalidInput { reason: "credit manager cannot be zero address" }.into());
        }
        self.credit_manager.set(new_address);
        Ok(())
    }

    /// Updates the UserRegistry address. Admin only.
    pub fn set_user_registry(&mut self, new_address: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }
        if new_address == Address::ZERO {
            return Err(CommonError::InvalidInput { reason: "user registry cannot be zero address" }.into());
        }
        self.user_registry.set(new_address);
        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // CHAT MANAGEMENT
    // ════════════════════════════════════════════════════════════════════════

    /// Creates a new chat. Name is stored on-chain; messages live in IPFS.
    pub fn create_chat(
        &mut self,
        name: String,
        cid: String,
        hash: FixedBytes<32>,
    ) -> Result<FixedBytes<32>, String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        if name.is_empty() {
            return Err(ChatError::InvalidName.into());
        }
        if cid.is_empty() {
            return Err(ChatError::InvalidCid.into());
        }
        if hash == FixedBytes::ZERO {
            return Err(ChatError::InvalidHash.into());
        }

        let nonce = self.nonces.get(caller);
        let chat_id = generate_id(self.vm(), caller, nonce);

        if self.chats.getter(chat_id).owner.get() != Address::ZERO {
            return Err(ChatError::IdCollision.into());
        }

        // CROSS-CONTRACT CALL: Consume credits for operation (single call)
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);

        let ctx = Call::new_mutating(self);
        credit_manager
            .consume_credits_for_op(self.vm(), ctx, caller, OP_CREATE_CHAT)
            .map_err(|_| ChatError::CreditConsumptionFailed)?;

        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut chat = self.chats.setter(chat_id);
        chat.chat_id.set(chat_id);
        chat.owner.set(caller);
        chat.latest_version.set(Uint::from(1u32));
        chat.current_cid.set_str(&cid);
        chat.current_hash.set(hash);
        chat.name.set_str(&name);
        chat.status.set(Uint::from(ResourceStatus::Active as u8));
        chat.created_at.set(timestamp);
        chat.updated_at.set(timestamp);

        self.nonces.setter(caller).set(nonce + U256::from(1));

        // Store chat_id in owner's list
        let chat_count: Uint<256, 4> = self.owner_chat_count.get(caller);
        self.owner_chats.setter(caller).setter(chat_count).set(chat_id);
        self.owner_chat_count.setter(caller).set(chat_count + U256::from(1));

        self.total_chats.set(self.total_chats.get() + U256::from(1));

        // CROSS-CONTRACT CALL: Update user stats in UserRegistry
        let user_registry_addr = self.user_registry.get();
        let user_registry = IUserRegistry::new(user_registry_addr);
        let ctx = Call::new_mutating(self);
        user_registry
            .increment_chats(self.vm(), ctx, caller)
            .map_err(|_| String::from("ChatRegistry: failed to update user stats"))?;

        self.vm().log(ChatCreated {
            chat_id,
            owner: caller,
            cid,
            hash,
            name,
        });

        Ok(chat_id)
    }

    /// Updates a chat with new content and optional new name.
    pub fn update_chat(
        &mut self,
        chat_id: FixedBytes<32>,
        new_cid: String,
        new_hash: FixedBytes<32>,
        new_name: String,
    ) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        let owner = self.chats.getter(chat_id).owner.get();
        if owner == Address::ZERO {
            return Err(ChatError::NotFound.into());
        }

        if caller != owner {
            return Err(ChatError::NotOwner.into());
        }

        let status: Uint<8, 1> = self.chats.getter(chat_id).status.get();
        if status == Uint::from(ResourceStatus::Archived as u8) {
            return Err(ChatError::Archived.into());
        }

        if new_cid.is_empty() {
            return Err(ChatError::InvalidCid.into());
        }
        if new_hash == FixedBytes::ZERO {
            return Err(ChatError::InvalidHash.into());
        }
        if new_name.is_empty() {
            return Err(ChatError::InvalidName.into());
        }

        // CROSS-CONTRACT CALL: Consume credits for operation (single call)
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);

        let ctx = Call::new_mutating(self);
        credit_manager
            .consume_credits_for_op(self.vm(), ctx, caller, OP_UPDATE_CHAT)
            .map_err(|_| ChatError::CreditConsumptionFailed)?;

        let current_version: Uint<32, 1> = self.chats.getter(chat_id).latest_version.get();
        let new_version = current_version + Uint::from(1u32);
        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut chat = self.chats.setter(chat_id);
        chat.latest_version.set(new_version);
        chat.current_cid.set_str(&new_cid);
        chat.current_hash.set(new_hash);
        chat.name.set_str(&new_name);
        chat.updated_at.set(timestamp);

        self.vm().log(ChatUpdated {
            chat_id,
            owner: caller,
            new_cid,
            new_hash,
            new_version: u32::try_from(new_version).unwrap_or(0),
        });

        Ok(())
    }

    /// Archives a chat (soft delete).
    pub fn archive_chat(&mut self, chat_id: FixedBytes<32>) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        let owner = self.chats.getter(chat_id).owner.get();
        if owner == Address::ZERO {
            return Err(ChatError::NotFound.into());
        }

        if caller != owner {
            return Err(ChatError::NotOwner.into());
        }

        let status: Uint<8, 1> = self.chats.getter(chat_id).status.get();
        if status == Uint::from(ResourceStatus::Archived as u8) {
            return Err(ChatError::Archived.into());
        }

        let timestamp = Uint::from(self.vm().block_timestamp());
        let mut chat = self.chats.setter(chat_id);
        chat.status.set(Uint::from(ResourceStatus::Archived as u8));
        chat.updated_at.set(timestamp);

        self.vm().log(ChatArchived {
            chat_id,
            owner: caller,
        });

        Ok(())
    }

    /// Restores an archived chat.
    pub fn restore_chat(&mut self, chat_id: FixedBytes<32>) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        let owner = self.chats.getter(chat_id).owner.get();
        if owner == Address::ZERO {
            return Err(ChatError::NotFound.into());
        }

        if caller != owner {
            return Err(ChatError::NotOwner.into());
        }

        let status: Uint<8, 1> = self.chats.getter(chat_id).status.get();
        if status != Uint::from(ResourceStatus::Archived as u8) {
            return Err(ChatError::NotArchived.into());
        }

        let timestamp = Uint::from(self.vm().block_timestamp());
        let mut chat = self.chats.setter(chat_id);
        chat.status.set(Uint::from(ResourceStatus::Active as u8));
        chat.updated_at.set(timestamp);

        self.vm().log(ChatRestored {
            chat_id,
            owner: caller,
        });

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════

    /// Returns chat data.
    pub fn get_chat(
        &self,
        chat_id: FixedBytes<32>,
    ) -> Result<(Address, u32, String, FixedBytes<32>, String, u8, u64, u64), String> {
        let chat = self.chats.getter(chat_id);
        let owner = chat.owner.get();

        if owner == Address::ZERO {
            return Err(ChatError::NotFound.into());
        }

        Ok((
            owner,
            u32::try_from(chat.latest_version.get()).unwrap_or(0),
            chat.current_cid.get_string(),
            chat.current_hash.get(),
            chat.name.get_string(),
            u8::try_from(chat.status.get()).unwrap_or(0),
            u64::try_from(chat.created_at.get()).unwrap_or(0),
            u64::try_from(chat.updated_at.get()).unwrap_or(0),
        ))
    }

    /// Returns the total number of chats created.
    pub fn total_chats(&self) -> U256 {
        self.total_chats.get()
    }

    /// Returns the admin address.
    pub fn admin(&self) -> Address {
        self.admin.get()
    }

    /// Returns the number of chats owned by an address.
    pub fn get_chat_count_by_owner(&self, owner: Address) -> U256 {
        self.owner_chat_count.get(owner)
    }

    /// Returns the current nonce for a user.
    pub fn get_nonce(&self, owner: Address) -> U256 {
        self.nonces.get(owner)
    }

    /// Returns a chat ID by owner and index with boundary check.
    pub fn get_chat_by_owner_index(&self, owner: Address, index: U256) -> Result<FixedBytes<32>, String> {
        let count = self.owner_chat_count.get(owner);
        if index >= count {
            return Err(String::from("ChatRegistry: index out of bounds"));
        }
        Ok(self.owner_chats.getter(owner).getter(index).get())
    }

    /// Returns the CreditManager address.
    pub fn credit_manager(&self) -> Address {
        self.credit_manager.get()
    }

    /// Returns the UserRegistry address.
    pub fn user_registry(&self) -> Address {
        self.user_registry.get()
    }
}

// ════════════════════════════════════════════════════════════════════════════
// TESTS
// ════════════════════════════════════════════════════════════════════════════

#[cfg(test)]
mod tests {
    use super::*;
    use stylus_sdk::testing::*;

    const DEFAULT_SENDER: Address = Address::new([
        0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD,
        0xBE, 0xEF, 0xDE, 0xAD, 0xBE, 0xEF, 0xDE, 0xAD, 0xBE, 0xEF,
    ]);

    fn setup() -> (TestVM, ChatRegistry) {
        let vm = TestVM::default();
        let mut contract = ChatRegistry::from(&vm);
        let credit_manager = Address::new([0x11; 20]);
        let user_registry = Address::new([0x22; 20]);
        contract.initialize(credit_manager, user_registry);
        (vm, contract)
    }

    #[test]
    fn test_initialize() {
        let (_vm, contract) = setup();
        assert_eq!(contract.admin(), DEFAULT_SENDER);
        assert_eq!(contract.total_chats(), U256::from(0));
    }

    #[test]
    fn test_get_chat_not_found() {
        let (_vm, contract) = setup();
        let fake_id = FixedBytes::from([0x01; 32]);
        assert!(contract.get_chat(fake_id).is_err());
    }

    #[test]
    fn test_get_chat_count_by_owner() {
        let (_vm, contract) = setup();
        assert_eq!(contract.get_chat_count_by_owner(DEFAULT_SENDER), U256::from(0));
    }

    #[test]
    fn test_pausable() {
        let (_vm, mut contract) = setup();
        assert!(!contract.is_paused());
        contract.pause().unwrap();
        assert!(contract.is_paused());
        assert!(contract.archive_chat(FixedBytes::from([0x01; 32])).is_err());
        contract.unpause().unwrap();
        assert!(!contract.is_paused());
    }

    #[test]
    fn test_setters() {
        let (_vm, mut contract) = setup();
        let new_cm = Address::new([0x33; 20]);
        let new_ur = Address::new([0x44; 20]);
        contract.set_credit_manager(new_cm).unwrap();
        contract.set_user_registry(new_ur).unwrap();
        assert_eq!(contract.credit_manager(), new_cm);
        assert_eq!(contract.user_registry(), new_ur);
    }
}
