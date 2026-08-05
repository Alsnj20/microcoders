//! MemoryRegistry Contract
//!
//! Manages the lifecycle of user memories (knowledge units).

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, FixedBytes, Uint, U256};
use memorychain_common::{
    events::*,
    helpers::generate_id,
    interfaces::ICreditManager,
    types::ResourceStatus,
};
use stylus_core::calls::Call;
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct MemoryRegistry {
        mapping(bytes32 => Memory) memories;
        mapping(bytes32 => mapping(uint32 => MemoryVersion)) versions;
        uint256 total_memories;
        address credit_manager;
        mapping(address => uint256) nonces;
        address admin;
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
    /// Initializes the contract with CreditManager address.
    pub fn initialize(&mut self, credit_manager: Address) {
        if self.admin.get() == Address::ZERO {
            self.admin.set(self.vm().msg_sender());
            self.credit_manager.set(credit_manager);
        }
    }

    /// Creates a new memory AFTER backend processing is complete.
    pub fn create_memory(
        &mut self,
        cid: String,
        hash: FixedBytes<32>,
        memory_type: u8,
        vis: u8,
    ) -> Result<FixedBytes<32>, String> {
        let caller = self.vm().msg_sender();

        if cid.is_empty() {
            return Err(String::from("MemoryRegistry: empty CID"));
        }
        if hash == FixedBytes::ZERO {
            return Err(String::from("MemoryRegistry: zero hash"));
        }

        let nonce = self.nonces.get(caller);
        let memory_id = generate_id(self.vm(), caller, nonce);

        if self.memories.getter(memory_id).owner.get() != Address::ZERO {
            return Err(String::from("MemoryRegistry: ID collision"));
        }

        // CROSS-CONTRACT CALL: Consume credits via CreditManager
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);
        let context = Call::new_mutating(self);
        let success = credit_manager
            .consume_credits(self.vm(), context, caller, 1)
            .map_err(|_| String::from("MemoryRegistry: credit consumption failed"))?;

        if !success {
            return Err(String::from("MemoryRegistry: insufficient credits"));
        }

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
        self.total_memories.set(self.total_memories.get() + U256::from(1));

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

        // CROSS-CONTRACT CALL: Consume credits
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);
        let context = Call::new_mutating(self);
        let success = credit_manager
            .consume_credits(self.vm(), context, caller, 1)
            .map_err(|_| String::from("MemoryRegistry: credit consumption failed"))?;

        if !success {
            return Err(String::from("MemoryRegistry: insufficient credits"));
        }

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
}
