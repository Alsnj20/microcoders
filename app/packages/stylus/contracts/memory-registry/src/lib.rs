//! MemoryRegistry Contract
//!
//! Manages the lifecycle of user memories (knowledge units).
//! Metadata lives in IPFS; only CID and hash are stored on-chain.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, FixedBytes, Uint, U256};
use memorychain_common::{
    errors::{CommonError, MemoryError},
    events::*,
    helpers::generate_id,
    impl_admin_transfer, impl_pausable,
    interfaces::{ICreditManager, IUserRegistry},
    types::{MemoryType, ResourceStatus, Visibility, OP_CREATE_MEMORY, OP_UPDATE_MEMORY},
};
use stylus_core::calls::Call;
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct MemoryRegistry {
        mapping(bytes32 => Memory) memories;
        mapping(address => mapping(uint256 => bytes32)) owner_memories;
        mapping(address => uint256) owner_memory_count;
        uint256 total_memories;
        address credit_manager;
        address user_registry;
        mapping(address => uint256) nonces;
        address admin;
        address pending_admin;
        bool paused;
    }

    pub struct Memory {
        bytes32 memory_id;
        address owner;
        uint32 latest_version;
        string current_cid;
        bytes32 current_hash;
        string name;
        uint8 memory_type;
        uint8 visibility;
        uint8 status;
        uint64 created_at;
        uint64 updated_at;
    }
}

#[public]
impl MemoryRegistry {
    /// Initializes the contract with CreditManager and UserRegistry addresses.
    pub fn initialize(&mut self, credit_manager: Address, user_registry: Address) -> Result<(), String> {
        if self.admin.get() != Address::ZERO {
            return Err(String::from("MemoryRegistry: already initialized"));
        }
        if credit_manager == Address::ZERO || user_registry == Address::ZERO {
            return Err(String::from("MemoryRegistry: zero address provided"));
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
    // MEMORY MANAGEMENT
    // ════════════════════════════════════════════════════════════════════════

    /// Creates a new memory AFTER backend processing is complete.
    ///
    /// # Parameters
    /// - `name`: Human-readable name for the memory
    /// - `cid`: IPFS content identifier
    /// - `hash`: Content hash for integrity verification
    /// - `memory_type`: Category (0=Preference, 1=Knowledge, 2=Document, 3=Objective, 4=Other)
    /// - `vis`: Visibility level (0=Private, 1=Public, 2=Restricted). Default: 0 (Private)
    pub fn create_memory(
        &mut self,
        name: String,
        cid: String,
        hash: FixedBytes<32>,
        memory_type: u8,
        vis: u8,
    ) -> Result<FixedBytes<32>, String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        if name.is_empty() {
            return Err(MemoryError::InvalidName.into());
        }
        if cid.is_empty() {
            return Err(MemoryError::InvalidCid.into());
        }
        if hash == FixedBytes::ZERO {
            return Err(MemoryError::InvalidHash.into());
        }
        if memory_type > MemoryType::Other as u8 {
            return Err(CommonError::InvalidInput { reason: "invalid memory type" }.into());
        }
        if vis > Visibility::max_value() {
            return Err(CommonError::InvalidInput { reason: "invalid visibility" }.into());
        }

        let nonce = self.nonces.get(caller);
        let memory_id = generate_id(self.vm(), caller, nonce);

        if self.memories.getter(memory_id).owner.get() != Address::ZERO {
            return Err(MemoryError::IdCollision.into());
        }

        // CROSS-CONTRACT CALL: Consume credits for operation (single call)
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);

        let ctx = Call::new_mutating(self);
        credit_manager
            .consume_credits_for_op(self.vm(), ctx, caller, OP_CREATE_MEMORY)
            .map_err(|_| MemoryError::CreditConsumptionFailed)?;

        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut memory = self.memories.setter(memory_id);
        memory.memory_id.set(memory_id);
        memory.owner.set(caller);
        memory.latest_version.set(Uint::from(1u32));
        memory.current_cid.set_str(&cid);
        memory.current_hash.set(hash);
        memory.name.set_str(&name);
        memory.memory_type.set(Uint::from(memory_type));
        memory.visibility.set(Uint::from(vis));
        memory.status.set(Uint::from(ResourceStatus::Active as u8));
        memory.created_at.set(timestamp);
        memory.updated_at.set(timestamp);

        self.nonces.setter(caller).set(nonce + U256::from(1));

        // Store memory_id in owner's list
        let memory_count: Uint<256, 4> = self.owner_memory_count.get(caller);
        self.owner_memories.setter(caller).setter(memory_count).set(memory_id);
        self.owner_memory_count.setter(caller).set(memory_count + U256::from(1));

        self.total_memories.set(self.total_memories.get() + U256::from(1));

        // CROSS-CONTRACT CALL: Update user stats in UserRegistry
        let user_registry_addr = self.user_registry.get();
        let user_registry = IUserRegistry::new(user_registry_addr);
        let ctx = Call::new_mutating(self);
        user_registry
            .increment_memories(self.vm(), ctx, caller)
            .map_err(|_| String::from("MemoryRegistry: failed to update user stats"))?;

        self.vm().log(MemoryCreated {
            memory_id,
            owner: caller,
            cid,
            hash,
            memory_type,
            visibility: vis,
        });

        Ok(memory_id)
    }

    /// Updates an existing memory with new content.
    pub fn update_memory(
        &mut self,
        memory_id: FixedBytes<32>,
        new_cid: String,
        new_hash: FixedBytes<32>,
    ) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        let owner = self.memories.getter(memory_id).owner.get();
        if owner == Address::ZERO {
            return Err(MemoryError::NotFound.into());
        }

        if caller != owner {
            return Err(MemoryError::NotOwner.into());
        }

        let status: Uint<8, 1> = self.memories.getter(memory_id).status.get();
        if status == Uint::from(ResourceStatus::Archived as u8) {
            return Err(MemoryError::Archived.into());
        }

        if new_cid.is_empty() {
            return Err(MemoryError::InvalidCid.into());
        }
        if new_hash == FixedBytes::ZERO {
            return Err(MemoryError::InvalidHash.into());
        }

        // CROSS-CONTRACT CALL: Consume credits for operation (single call)
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);

        let ctx = Call::new_mutating(self);
        credit_manager
            .consume_credits_for_op(self.vm(), ctx, caller, OP_UPDATE_MEMORY)
            .map_err(|_| MemoryError::CreditConsumptionFailed)?;

        let current_version: Uint<32, 1> = self.memories.getter(memory_id).latest_version.get();
        let new_version = current_version + Uint::from(1u32);
        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut memory = self.memories.setter(memory_id);
        memory.latest_version.set(new_version);
        memory.current_cid.set_str(&new_cid);
        memory.current_hash.set(new_hash);
        memory.updated_at.set(timestamp);

        self.vm().log(MemoryUpdated {
            memory_id,
            owner: caller,
            new_cid,
            new_hash,
            new_version: u32::try_from(new_version).unwrap_or(0),
        });

        Ok(())
    }

    /// Archives a memory (soft delete).
    pub fn archive_memory(&mut self, memory_id: FixedBytes<32>) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        let owner = self.memories.getter(memory_id).owner.get();
        if owner == Address::ZERO {
            return Err(MemoryError::NotFound.into());
        }

        if caller != owner {
            return Err(MemoryError::NotOwner.into());
        }

        let status: Uint<8, 1> = self.memories.getter(memory_id).status.get();
        if status == Uint::from(ResourceStatus::Archived as u8) {
            return Err(MemoryError::Archived.into());
        }

        let timestamp = Uint::from(self.vm().block_timestamp());
        let mut memory = self.memories.setter(memory_id);
        memory.status.set(Uint::from(ResourceStatus::Archived as u8));
        memory.updated_at.set(timestamp);

        self.vm().log(MemoryArchived {
            memory_id,
            owner: caller,
        });

        Ok(())
    }

    /// Restores an archived memory.
    pub fn restore_memory(&mut self, memory_id: FixedBytes<32>) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        let owner = self.memories.getter(memory_id).owner.get();
        if owner == Address::ZERO {
            return Err(MemoryError::NotFound.into());
        }

        if caller != owner {
            return Err(MemoryError::NotOwner.into());
        }

        let status: Uint<8, 1> = self.memories.getter(memory_id).status.get();
        if status != Uint::from(ResourceStatus::Archived as u8) {
            return Err(MemoryError::NotArchived.into());
        }

        let timestamp = Uint::from(self.vm().block_timestamp());
        let mut memory = self.memories.setter(memory_id);
        memory.status.set(Uint::from(ResourceStatus::Active as u8));
        memory.updated_at.set(timestamp);

        self.vm().log(MemoryRestored {
            memory_id,
            owner: caller,
        });

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════

    /// Returns memory data.
    pub fn get_memory(
        &self,
        memory_id: FixedBytes<32>,
    ) -> Result<(Address, u32, String, FixedBytes<32>, String, u8, u8, u8), String> {
        let memory = self.memories.getter(memory_id);
        let owner = memory.owner.get();

        if owner == Address::ZERO {
            return Err(MemoryError::NotFound.into());
        }

        Ok((
            owner,
            u32::try_from(memory.latest_version.get()).unwrap_or(0),
            memory.current_cid.get_string(),
            memory.current_hash.get(),
            memory.name.get_string(),
            u8::try_from(memory.memory_type.get()).unwrap_or(0),
            u8::try_from(memory.visibility.get()).unwrap_or(0),
            u8::try_from(memory.status.get()).unwrap_or(0),
        ))
    }

    /// Returns the total number of memories created.
    pub fn total_memories(&self) -> U256 {
        self.total_memories.get()
    }

    /// Returns the CreditManager address.
    pub fn credit_manager(&self) -> Address {
        self.credit_manager.get()
    }

    /// Returns the admin address.
    pub fn admin(&self) -> Address {
        self.admin.get()
    }

    /// Returns the number of memories owned by an address.
    pub fn get_memory_count_by_owner(&self, owner: Address) -> U256 {
        self.owner_memory_count.get(owner)
    }

    /// Returns a memory ID by owner and index with boundary check.
    pub fn get_memory_by_owner_index(&self, owner: Address, index: U256) -> Result<FixedBytes<32>, String> {
        let count = self.owner_memory_count.get(owner);
        if index >= count {
            return Err(String::from("MemoryRegistry: index out of bounds"));
        }
        Ok(self.owner_memories.getter(owner).getter(index).get())
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

    fn setup() -> (TestVM, MemoryRegistry) {
        let vm = TestVM::default();
        let mut contract = MemoryRegistry::from(&vm);
        let credit_manager = Address::new([0x11; 20]);
        let user_registry = Address::new([0x22; 20]);
        contract.initialize(credit_manager, user_registry);
        (vm, contract)
    }

    #[test]
    fn test_initialize() {
        let (_vm, contract) = setup();
        assert_eq!(contract.admin(), DEFAULT_SENDER);
        assert_eq!(contract.total_memories(), U256::from(0));
    }

    #[test]
    fn test_get_memory_not_found() {
        let (_vm, contract) = setup();
        let fake_id = FixedBytes::from([0x01; 32]);
        assert!(contract.get_memory(fake_id).is_err());
    }

    #[test]
    fn test_get_memory_count_by_owner() {
        let (_vm, contract) = setup();
        assert_eq!(contract.get_memory_count_by_owner(DEFAULT_SENDER), U256::from(0));
    }

    #[test]
    fn test_pausable() {
        let (_vm, mut contract) = setup();
        assert!(!contract.is_paused());
        contract.pause().unwrap();
        assert!(contract.is_paused());
        assert!(contract.archive_memory(FixedBytes::from([0x01; 32])).is_err());
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
