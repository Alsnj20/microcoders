//! MemoryRegistry Contract
//!
//! Manages the lifecycle of user memories (knowledge units).

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, FixedBytes, Uint, U256};
use memorychain_common::{
    errors::CommonError,
    events::*,
    helpers::generate_id,
    interfaces::{ICreditManager, IUserRegistry},
    types::ResourceStatus,
};
use stylus_core::calls::Call;
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct MemoryRegistry {
        mapping(bytes32 => Memory) memories;
        mapping(bytes32 => mapping(uint32 => MemoryVersion)) versions;
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
        uint8 memory_type;
        uint8 visibility;
        uint8 status;
        uint64 created_at;
        uint64 updated_at;
    }

    pub struct MemoryVersion {
        bytes32 memory_id;
        uint32 version;
        string cid;
        bytes32 hash;
        uint64 created_at;
    }
}

#[public]
impl MemoryRegistry {
    /// Initializes the contract with CreditManager and UserRegistry addresses.
    pub fn initialize(&mut self, credit_manager: Address, user_registry: Address) {
        if self.admin.get() == Address::ZERO {
            self.admin.set(self.vm().msg_sender());
            self.credit_manager.set(credit_manager);
            self.user_registry.set(user_registry);
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
            return Err(String::from("MemoryRegistry: not pending admin"));
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

    /// Creates a new memory AFTER backend processing is complete.
    pub fn create_memory(
        &mut self,
        cid: String,
        hash: FixedBytes<32>,
        memory_type: u8,
        vis: u8,
    ) -> Result<FixedBytes<32>, String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        if cid.is_empty() {
            return Err(String::from("MemoryRegistry: empty CID"));
        }
        if hash == FixedBytes::ZERO {
            return Err(String::from("MemoryRegistry: zero hash"));
        }
        if memory_type > 4 {
            return Err(String::from("MemoryRegistry: invalid memory type"));
        }
        if vis > 2 {
            return Err(String::from("MemoryRegistry: invalid visibility"));
        }

        let nonce = self.nonces.get(caller);
        let memory_id = generate_id(self.vm(), caller, nonce);

        if self.memories.getter(memory_id).owner.get() != Address::ZERO {
            return Err(String::from("MemoryRegistry: ID collision"));
        }

        // CROSS-CONTRACT CALL: Get fee from CreditManager
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);
        
        let fee: u16 = credit_manager
            .get_fee(self.vm(), Call::new(), 1u8) // OP_CREATE_MEMORY = 1
            .map_err(|_| String::from("MemoryRegistry: failed to get fee"))?;
        let fee_u64 = u64::from(fee);

        // CROSS-CONTRACT CALL: Consume credits via CreditManager (reverts on insufficient)
        let context = Call::new_mutating(self);
        credit_manager
            .consume_credits(self.vm(), context, caller, fee_u64)
            .map_err(|_| String::from("MemoryRegistry: credit consumption failed"))?;

        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut memory = self.memories.setter(memory_id);
        memory.memory_id.set(memory_id);
        memory.owner.set(caller);
        memory.latest_version.set(Uint::from(1u32));
        memory.current_cid.set_str(&cid);
        memory.current_hash.set(hash);
        memory.memory_type.set(Uint::from(memory_type));
        memory.visibility.set(Uint::from(vis));
        memory.status.set(Uint::from(ResourceStatus::Active as u8));
        memory.created_at.set(timestamp);
        memory.updated_at.set(timestamp);

        let mut version_map = self.versions.setter(memory_id);
        let mut version = version_map.setter(Uint::from(1u32));
        version.memory_id.set(memory_id);
        version.version.set(Uint::from(1u32));
        version.cid.set_str(&cid);
        version.hash.set(hash);
        version.created_at.set(timestamp);

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
            return Err(String::from("MemoryRegistry: memory not found"));
        }

        if caller != owner {
            return Err(String::from("MemoryRegistry: not owner"));
        }

        let status: Uint<8, 1> = self.memories.getter(memory_id).status.get();
        if status == Uint::from(ResourceStatus::Archived as u8) {
            return Err(String::from("MemoryRegistry: memory is archived"));
        }

        if new_cid.is_empty() {
            return Err(String::from("MemoryRegistry: empty CID"));
        }
        if new_hash == FixedBytes::ZERO {
            return Err(String::from("MemoryRegistry: zero hash"));
        }

        // CROSS-CONTRACT CALL: Get fee from CreditManager
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);
        
        let fee: u16 = credit_manager
            .get_fee(self.vm(), Call::new(), 2u8) // OP_UPDATE_MEMORY = 2
            .map_err(|_| String::from("MemoryRegistry: failed to get fee"))?;
        let fee_u64 = u64::from(fee);

        // CROSS-CONTRACT CALL: Consume credits (reverts on insufficient)
        let context = Call::new_mutating(self);
        credit_manager
            .consume_credits(self.vm(), context, caller, fee_u64)
            .map_err(|_| String::from("MemoryRegistry: credit consumption failed"))?;

        let current_version: Uint<32, 1> = self.memories.getter(memory_id).latest_version.get();
        let new_version = current_version + Uint::from(1u32);
        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut memory = self.memories.setter(memory_id);
        memory.latest_version.set(new_version);
        memory.current_cid.set_str(&new_cid);
        memory.current_hash.set(new_hash);
        memory.updated_at.set(timestamp);

        let mut version_map = self.versions.setter(memory_id);
        let mut version = version_map.setter(new_version);
        version.memory_id.set(memory_id);
        version.version.set(new_version);
        version.cid.set_str(&new_cid);
        version.hash.set(new_hash);
        version.created_at.set(timestamp);

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
            return Err(String::from("MemoryRegistry: memory not found"));
        }

        if caller != owner {
            return Err(String::from("MemoryRegistry: not owner"));
        }

        let status: Uint<8, 1> = self.memories.getter(memory_id).status.get();
        if status == Uint::from(ResourceStatus::Archived as u8) {
            return Err(String::from("MemoryRegistry: already archived"));
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
            return Err(String::from("MemoryRegistry: memory not found"));
        }

        if caller != owner {
            return Err(String::from("MemoryRegistry: not owner"));
        }

        let status: Uint<8, 1> = self.memories.getter(memory_id).status.get();
        if status != Uint::from(ResourceStatus::Archived as u8) {
            return Err(String::from("MemoryRegistry: not archived"));
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

    /// Returns memory data.
    pub fn get_memory(
        &self,
        memory_id: FixedBytes<32>,
    ) -> Result<(Address, u32, String, FixedBytes<32>, u8, u8, u8), String> {
        let memory = self.memories.getter(memory_id);
        let owner = memory.owner.get();

        if owner == Address::ZERO {
            return Err(String::from("MemoryRegistry: not found"));
        }

        Ok((
            owner,
            u32::try_from(memory.latest_version.get()).unwrap_or(0),
            memory.current_cid.get_string(),
            memory.current_hash.get(),
            u8::try_from(memory.memory_type.get()).unwrap_or(0),
            u8::try_from(memory.visibility.get()).unwrap_or(0),
            u8::try_from(memory.status.get()).unwrap_or(0),
        ))
    }

    /// Returns a specific version of a memory.
    pub fn get_memory_version(
        &self,
        memory_id: FixedBytes<32>,
        version: u32,
    ) -> Result<(String, FixedBytes<32>, u64), String> {
        let versions_map = self.versions.getter(memory_id);
        let v = versions_map.getter(Uint::from(version));

        if v.version.get() == Uint::ZERO {
            return Err(String::from("MemoryRegistry: version not found"));
        }

        Ok((
            v.cid.get_string(),
            v.hash.get(),
            u64::try_from(v.created_at.get()).unwrap_or(0),
        ))
    }

    /// Returns the total number of memories created.
    pub fn total_memories(&self) -> U256 {
        self.total_memories.get()
    }

    /// Returns the cost to create a memory (in MC credits).
    /// Cross-contract call to CreditManager.get_fee(OP_CREATE_MEMORY).
    pub fn preview_create_cost(&self) -> u64 {
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);
        let context = Call::new();
        credit_manager
            .get_fee(self.vm(), context, 1) // OP_CREATE_MEMORY = 1
            .unwrap_or(1)
            .into()
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

    /// Returns a memory ID by owner and index.
    pub fn get_memory_by_owner_index(&self, owner: Address, index: U256) -> FixedBytes<32> {
        self.owner_memories.getter(owner).getter(index).get()
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
    fn test_get_memory_version_not_found() {
        let (_vm, contract) = setup();
        let fake_id = FixedBytes::from([0x01; 32]);
        assert!(contract.get_memory_version(fake_id, 1).is_err());
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
}
