//! AgentRegistry Contract
//!
//! Manages personal AI agents created by users.
//! Metadata (name, description) lives in IPFS; only CID and hash are stored on-chain.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, FixedBytes, Uint, U256};
use memorychain_common::{
    errors::{AgentError, CommonError},
    events::*,
    helpers::generate_id,
    impl_admin_transfer, impl_pausable,
    interfaces::{ICreditManager, IUserRegistry},
    types::{ResourceStatus, OP_CREATE_AGENT, OP_UPDATE_AGENT},
};
use stylus_core::calls::Call;
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct AgentRegistry {
        mapping(bytes32 => Agent) agents;
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
impl AgentRegistry {
    /// Initializes the contract with CreditManager and UserRegistry addresses.
    pub fn initialize(&mut self, credit_manager: Address, user_registry: Address) -> Result<(), String> {
        if self.admin.get() != Address::ZERO {
            return Err(String::from("AgentRegistry: already initialized"));
        }
        if credit_manager == Address::ZERO || user_registry == Address::ZERO {
            return Err(String::from("AgentRegistry: zero address provided"));
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
    // AGENT MANAGEMENT
    // ════════════════════════════════════════════════════════════════════════

    /// Creates a new agent. Metadata lives in IPFS; only CID and hash are stored.
    pub fn create_agent(
        &mut self,
        name: String,
        cid: String,
        hash: FixedBytes<32>,
    ) -> Result<FixedBytes<32>, String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        if name.is_empty() {
            return Err(AgentError::InvalidName.into());
        }
        if cid.is_empty() {
            return Err(AgentError::InvalidCid.into());
        }
        if hash == FixedBytes::ZERO {
            return Err(AgentError::InvalidHash.into());
        }

        let nonce = self.nonces.get(caller);
        let agent_id = generate_id(self.vm(), caller, nonce);

        if self.agents.getter(agent_id).owner.get() != Address::ZERO {
            return Err(AgentError::IdCollision.into());
        }

        // CROSS-CONTRACT CALL: Consume credits for operation (single call)
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);

        let ctx = Call::new_mutating(self);
        credit_manager
            .consume_credits_for_op(self.vm(), ctx, caller, OP_CREATE_AGENT)
            .map_err(|_| AgentError::CreditConsumptionFailed)?;

        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut agent = self.agents.setter(agent_id);
        agent.agent_id.set(agent_id);
        agent.owner.set(caller);
        agent.latest_version.set(Uint::from(1u32));
        agent.current_cid.set_str(&cid);
        agent.current_hash.set(hash);
        agent.name.set_str(&name);
        agent.status.set(Uint::from(ResourceStatus::Active as u8));
        agent.created_at.set(timestamp);
        agent.updated_at.set(timestamp);

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
            return Err(AgentError::NotFound.into());
        }

        if caller != owner {
            return Err(AgentError::NotOwner.into());
        }

        let status: Uint<8, 1> = self.agents.getter(agent_id).status.get();
        if status == Uint::from(ResourceStatus::Archived as u8) {
            return Err(AgentError::Archived.into());
        }

        if new_cid.is_empty() {
            return Err(AgentError::InvalidCid.into());
        }
        if new_hash == FixedBytes::ZERO {
            return Err(AgentError::InvalidHash.into());
        }

        // CROSS-CONTRACT CALL: Consume credits for operation (single call)
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);

        let ctx = Call::new_mutating(self);
        credit_manager
            .consume_credits_for_op(self.vm(), ctx, caller, OP_UPDATE_AGENT)
            .map_err(|_| AgentError::CreditConsumptionFailed)?;

        let current_version: Uint<32, 1> = self.agents.getter(agent_id).latest_version.get();
        let new_version = current_version + Uint::from(1u32);
        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut agent = self.agents.setter(agent_id);
        agent.latest_version.set(new_version);
        agent.current_cid.set_str(&new_cid);
        agent.current_hash.set(new_hash);
        agent.updated_at.set(timestamp);

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
            return Err(AgentError::NotFound.into());
        }

        if caller != owner {
            return Err(AgentError::NotOwner.into());
        }

        let status: Uint<8, 1> = self.agents.getter(agent_id).status.get();
        if status == Uint::from(ResourceStatus::Archived as u8) {
            return Err(AgentError::Archived.into());
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
            return Err(AgentError::NotFound.into());
        }

        if caller != owner {
            return Err(AgentError::NotOwner.into());
        }

        let status: Uint<8, 1> = self.agents.getter(agent_id).status.get();
        if status != Uint::from(ResourceStatus::Archived as u8) {
            return Err(AgentError::NotArchived.into());
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

    // ════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════

    /// Returns agent data (control data only; metadata is in IPFS).
    pub fn get_agent(
        &self,
        agent_id: FixedBytes<32>,
    ) -> Result<(Address, u32, String, FixedBytes<32>, String, u8, u64, u64), String> {
        let agent = self.agents.getter(agent_id);
        let owner = agent.owner.get();

        if owner == Address::ZERO {
            return Err(AgentError::NotFound.into());
        }

        Ok((
            owner,
            u32::try_from(agent.latest_version.get()).unwrap_or(0),
            agent.current_cid.get_string(),
            agent.current_hash.get(),
            agent.name.get_string(),
            u8::try_from(agent.status.get()).unwrap_or(0),
            u64::try_from(agent.created_at.get()).unwrap_or(0),
            u64::try_from(agent.updated_at.get()).unwrap_or(0),
        ))
    }

    /// Returns the total number of agents created.
    pub fn total_agents(&self) -> U256 {
        self.total_agents.get()
    }

    /// Returns the admin address.
    pub fn admin(&self) -> Address {
        self.admin.get()
    }



    /// Returns the number of agents owned by an address.
    pub fn get_agent_count_by_owner(&self, owner: Address) -> U256 {
        self.owner_agent_count.get(owner)
    }

    /// Returns the current nonce for a user.
    pub fn get_nonce(&self, owner: Address) -> U256 {
        self.nonces.get(owner)
    }

    /// Returns an agent ID by owner and index with boundary check.
    pub fn get_agent_by_owner_index(&self, owner: Address, index: U256) -> Result<FixedBytes<32>, String> {
        let count = self.owner_agent_count.get(owner);
        if index >= count {
            return Err(String::from("AgentRegistry: index out of bounds"));
        }
        Ok(self.owner_agents.getter(owner).getter(index).get())
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
