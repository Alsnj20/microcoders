//! AgentRegistry Contract
//!
//! Manages personal AI agents created by users.

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
    pub struct AgentRegistry {
        mapping(bytes32 => Agent) agents;
        mapping(bytes32 => mapping(uint32 => AgentVersion)) versions;
        mapping(address => mapping(uint256 => bytes32)) owner_agents;
        mapping(address => uint256) owner_agent_count;
        uint256 total_agents;
        address credit_manager;
        address user_registry;
        mapping(address => uint256) nonces;
        address admin;
        address pending_admin;
        bool paused;
    }

    pub struct Agent {
        bytes32 agent_id;
        address owner;
        string name;
        string description;
        uint32 latest_version;
        string current_cid;
        bytes32 current_hash;
        uint8 status;
        uint64 created_at;
        uint64 updated_at;
    }

    pub struct AgentVersion {
        bytes32 agent_id;
        uint32 version;
        string cid;
        bytes32 hash;
        uint64 created_at;
    }
}

#[public]
impl AgentRegistry {
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
            return Err(String::from("AgentRegistry: not pending admin"));
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

    /// Creates a new agent AFTER backend processing is complete.
    pub fn create_agent(
        &mut self,
        name: String,
        description: String,
        cid: String,
        hash: FixedBytes<32>,
    ) -> Result<FixedBytes<32>, String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        if name.is_empty() {
            return Err(String::from("AgentRegistry: empty name"));
        }
        if cid.is_empty() {
            return Err(String::from("AgentRegistry: empty CID"));
        }
        if hash == FixedBytes::ZERO {
            return Err(String::from("AgentRegistry: zero hash"));
        }

        let nonce = self.nonces.get(caller);
        let agent_id = generate_id(self.vm(), caller, nonce);

        if self.agents.getter(agent_id).owner.get() != Address::ZERO {
            return Err(String::from("AgentRegistry: ID collision"));
        }

        // CROSS-CONTRACT CALL: Get fee from CreditManager
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);
        
        let fee: u16 = credit_manager
            .get_fee(self.vm(), Call::new(), 3u8) // OP_CREATE_AGENT = 3
            .map_err(|_| String::from("AgentRegistry: failed to get fee"))?;
        let fee_u64 = u64::from(fee);

        // CROSS-CONTRACT CALL: Consume credits (reverts on insufficient)
        let context = Call::new_mutating(self);
        credit_manager
            .consume_credits(self.vm(), context, caller, fee_u64)
            .map_err(|_| String::from("AgentRegistry: credit consumption failed"))?;

        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut agent = self.agents.setter(agent_id);
        agent.agent_id.set(agent_id);
        agent.owner.set(caller);
        agent.name.set_str(&name);
        agent.description.set_str(&description);
        agent.latest_version.set(Uint::from(1u32));
        agent.current_cid.set_str(&cid);
        agent.current_hash.set(hash);
        agent.status.set(Uint::from(ResourceStatus::Active as u8));
        agent.created_at.set(timestamp);
        agent.updated_at.set(timestamp);

        let mut version_map = self.versions.setter(agent_id);
        let mut version = version_map.setter(Uint::from(1u32));
        version.agent_id.set(agent_id);
        version.version.set(Uint::from(1u32));
        version.cid.set_str(&cid);
        version.hash.set(hash);
        version.created_at.set(timestamp);

        self.nonces.setter(caller).set(nonce + U256::from(1));
        
        // Store agent_id in owner's list
        let agent_count: Uint<256, 4> = self.owner_agent_count.get(caller);
        self.owner_agents.setter(caller).setter(agent_count).set(agent_id);
        self.owner_agent_count.setter(caller).set(agent_count + U256::from(1));
        
        self.total_agents.set(self.total_agents.get() + U256::from(1));

        // CROSS-CONTRACT CALL: Update user stats in UserRegistry
        let user_registry_addr = self.user_registry.get();
        let user_registry = IUserRegistry::new(user_registry_addr);
        let ctx = Call::new_mutating(self);
        user_registry
            .increment_agents(self.vm(), ctx, caller)
            .map_err(|_| String::from("AgentRegistry: failed to update user stats"))?;

        self.vm().log(AgentCreated {
            agent_id,
            owner: caller,
            name,
            cid,
            hash,
        });

        Ok(agent_id)
    }

    /// Updates an agent with a new blueprint.
    pub fn update_agent(
        &mut self,
        agent_id: FixedBytes<32>,
        new_cid: String,
        new_hash: FixedBytes<32>,
    ) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        let owner = self.agents.getter(agent_id).owner.get();
        if owner == Address::ZERO {
            return Err(String::from("AgentRegistry: agent not found"));
        }

        if caller != owner {
            return Err(String::from("AgentRegistry: not owner"));
        }

        let status: Uint<8, 1> = self.agents.getter(agent_id).status.get();
        if status == Uint::from(ResourceStatus::Archived as u8) {
            return Err(String::from("AgentRegistry: agent is archived"));
        }

        if new_cid.is_empty() {
            return Err(String::from("AgentRegistry: empty CID"));
        }
        if new_hash == FixedBytes::ZERO {
            return Err(String::from("AgentRegistry: zero hash"));
        }

        // CROSS-CONTRACT CALL: Get fee from CreditManager
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);
        
        let fee: u16 = credit_manager
            .get_fee(self.vm(), Call::new(), 4u8) // OP_UPDATE_AGENT = 4
            .map_err(|_| String::from("AgentRegistry: failed to get fee"))?;
        let fee_u64 = u64::from(fee);

        // CROSS-CONTRACT CALL: Consume credits (reverts on insufficient)
        let context = Call::new_mutating(self);
        credit_manager
            .consume_credits(self.vm(), context, caller, fee_u64)
            .map_err(|_| String::from("AgentRegistry: credit consumption failed"))?;

        let current_version: Uint<32, 1> = self.agents.getter(agent_id).latest_version.get();
        let new_version = current_version + Uint::from(1u32);
        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut agent = self.agents.setter(agent_id);
        agent.latest_version.set(new_version);
        agent.current_cid.set_str(&new_cid);
        agent.current_hash.set(new_hash);
        agent.updated_at.set(timestamp);

        let mut version_map = self.versions.setter(agent_id);
        let mut version = version_map.setter(new_version);
        version.agent_id.set(agent_id);
        version.version.set(new_version);
        version.cid.set_str(&new_cid);
        version.hash.set(new_hash);
        version.created_at.set(timestamp);

        self.vm().log(AgentUpdated {
            agent_id,
            owner: caller,
            new_cid,
            new_hash,
            new_version: u32::try_from(new_version).unwrap_or(0),
        });

        Ok(())
    }

    /// Archives an agent (soft delete).
    pub fn archive_agent(&mut self, agent_id: FixedBytes<32>) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        let owner = self.agents.getter(agent_id).owner.get();
        if owner == Address::ZERO {
            return Err(String::from("AgentRegistry: agent not found"));
        }

        if caller != owner {
            return Err(String::from("AgentRegistry: not owner"));
        }

        let status: Uint<8, 1> = self.agents.getter(agent_id).status.get();
        if status == Uint::from(ResourceStatus::Archived as u8) {
            return Err(String::from("AgentRegistry: already archived"));
        }

        let timestamp = Uint::from(self.vm().block_timestamp());
        let mut agent = self.agents.setter(agent_id);
        agent.status.set(Uint::from(ResourceStatus::Archived as u8));
        agent.updated_at.set(timestamp);

        self.vm().log(AgentArchived {
            agent_id,
            owner: caller,
        });

        Ok(())
    }

    /// Restores an archived agent.
    pub fn restore_agent(&mut self, agent_id: FixedBytes<32>) -> Result<(), String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        let owner = self.agents.getter(agent_id).owner.get();
        if owner == Address::ZERO {
            return Err(String::from("AgentRegistry: agent not found"));
        }

        if caller != owner {
            return Err(String::from("AgentRegistry: not owner"));
        }

        let status: Uint<8, 1> = self.agents.getter(agent_id).status.get();
        if status != Uint::from(ResourceStatus::Archived as u8) {
            return Err(String::from("AgentRegistry: not archived"));
        }

        let timestamp = Uint::from(self.vm().block_timestamp());
        let mut agent = self.agents.setter(agent_id);
        agent.status.set(Uint::from(ResourceStatus::Active as u8));
        agent.updated_at.set(timestamp);

        self.vm().log(AgentRestored {
            agent_id,
            owner: caller,
        });

        Ok(())
    }

    /// Returns agent data.
    pub fn get_agent(
        &self,
        agent_id: FixedBytes<32>,
    ) -> Result<(Address, String, String, u32, String, FixedBytes<32>, u8, u64, u64), String> {
        let agent = self.agents.getter(agent_id);
        let owner = agent.owner.get();

        if owner == Address::ZERO {
            return Err(String::from("AgentRegistry: not found"));
        }

        Ok((
            owner,
            agent.name.get_string(),
            agent.description.get_string(),
            u32::try_from(agent.latest_version.get()).unwrap_or(0),
            agent.current_cid.get_string(),
            agent.current_hash.get(),
            u8::try_from(agent.status.get()).unwrap_or(0),
            u64::try_from(agent.created_at.get()).unwrap_or(0),
            u64::try_from(agent.updated_at.get()).unwrap_or(0),
        ))
    }

    /// Returns a specific version of an agent's blueprint.
    pub fn get_agent_version(
        &self,
        agent_id: FixedBytes<32>,
        version: u32,
    ) -> Result<(String, FixedBytes<32>, u64), String> {
        let versions_map = self.versions.getter(agent_id);
        let v = versions_map.getter(Uint::from(version));

        if v.version.get() == Uint::ZERO {
            return Err(String::from("AgentRegistry: version not found"));
        }

        Ok((
            v.cid.get_string(),
            v.hash.get(),
            u64::try_from(v.created_at.get()).unwrap_or(0),
        ))
    }

    /// Returns the total number of agents created.
    pub fn total_agents(&self) -> U256 {
        self.total_agents.get()
    }

    /// Returns the cost to create an agent (in MC credits).
    /// Cross-contract call to CreditManager.get_fee(OP_CREATE_AGENT).
    pub fn preview_create_cost(&self) -> u64 {
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);
        let context = Call::new();
        credit_manager
            .get_fee(self.vm(), context, 3) // OP_CREATE_AGENT = 3
            .unwrap_or(5)
            .into()
    }

    /// Returns the admin address.
    pub fn admin(&self) -> Address {
        self.admin.get()
    }

    /// Returns the number of agents owned by an address.
    pub fn get_agent_count_by_owner(&self, owner: Address) -> U256 {
        self.owner_agent_count.get(owner)
    }

    /// Returns an agent ID by owner and index.
    pub fn get_agent_by_owner_index(&self, owner: Address, index: U256) -> FixedBytes<32> {
        self.owner_agents.getter(owner).getter(index).get()
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

    fn setup() -> (TestVM, AgentRegistry) {
        let vm = TestVM::default();
        let mut contract = AgentRegistry::from(&vm);
        let credit_manager = Address::new([0x11; 20]);
        let user_registry = Address::new([0x22; 20]);
        contract.initialize(credit_manager, user_registry);
        (vm, contract)
    }

    #[test]
    fn test_initialize() {
        let (_vm, contract) = setup();
        assert_eq!(contract.admin(), DEFAULT_SENDER);
        assert_eq!(contract.total_agents(), U256::from(0));
    }

    #[test]
    fn test_get_agent_not_found() {
        let (_vm, contract) = setup();
        let fake_id = FixedBytes::from([0x01; 32]);
        assert!(contract.get_agent(fake_id).is_err());
    }

    #[test]
    fn test_get_agent_version_not_found() {
        let (_vm, contract) = setup();
        let fake_id = FixedBytes::from([0x01; 32]);
        assert!(contract.get_agent_version(fake_id, 1).is_err());
    }

    #[test]
    fn test_get_agent_count_by_owner() {
        let (_vm, contract) = setup();
        assert_eq!(contract.get_agent_count_by_owner(DEFAULT_SENDER), U256::from(0));
    }

    #[test]
    fn test_pausable() {
        let (_vm, mut contract) = setup();
        assert!(!contract.is_paused());
        contract.pause().unwrap();
        assert!(contract.is_paused());
        assert!(contract.archive_agent(FixedBytes::from([0x01; 32])).is_err());
        contract.unpause().unwrap();
        assert!(!contract.is_paused());
    }
}
