//! ContextRegistry Contract
//!
//! Manages many-to-many relationships between agents and memories.
//! This is the CORE of the protocol.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, FixedBytes, Uint, U256};
use memorychain_common::{
    errors::{CommonError, ContextError},
    events::*,
    helpers::generate_id,
    interfaces::{IAgentRegistry, ICreditManager, IMemoryRegistry},
    impl_admin_transfer, impl_pausable,
    types::OP_LINK_MEMORY,
};
use stylus_core::calls::Call;
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct ContextRegistry {
        mapping(bytes32 => AgentMemoryContext) contexts;
        mapping(bytes32 => mapping(bytes32 => bytes32)) agent_memory_link;
        mapping(bytes32 => bool) context_enabled;
        mapping(bytes32 => mapping(uint256 => bytes32)) agent_contexts;
        mapping(bytes32 => uint256) agent_context_count;
        mapping(address => uint256) nonces;
        address memory_registry;
        address agent_registry;
        address credit_manager;
        address admin;
        address pending_admin;
        bool paused;
    }

    pub struct AgentMemoryContext {
        bytes32 context_id;
        bytes32 agent_id;
        bytes32 memory_id;
        uint8 priority;
        bool enabled;
        uint64 created_at;
    }
}

#[public]
impl ContextRegistry {
    /// Initializes the contract with MemoryRegistry, AgentRegistry, and CreditManager addresses.
    pub fn initialize(
        &mut self,
        memory_registry: Address,
        agent_registry: Address,
        credit_manager: Address,
    ) -> Result<(), String> {
        if self.admin.get() != Address::ZERO {
            return Err(String::from("ContextRegistry: already initialized"));
        }
        if memory_registry == Address::ZERO
            || agent_registry == Address::ZERO
            || credit_manager == Address::ZERO
        {
            return Err(String::from("ContextRegistry: zero address provided"));
        }

        self.admin.set(self.vm().msg_sender());
        self.memory_registry.set(memory_registry);
        self.agent_registry.set(agent_registry);
        self.credit_manager.set(credit_manager);

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // PAUSABLE & ADMIN
    // ════════════════════════════════════════════════════════════════════════

    impl_pausable!();
    impl_admin_transfer!();

    /// Updates the MemoryRegistry address. Admin only.
    pub fn set_memory_registry(&mut self, new_address: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }
        if new_address == Address::ZERO {
            return Err(CommonError::InvalidInput { reason: "cannot be zero address" }.into());
        }
        self.memory_registry.set(new_address);
        Ok(())
    }

    /// Updates the AgentRegistry address. Admin only.
    pub fn set_agent_registry(&mut self, new_address: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }
        if new_address == Address::ZERO {
            return Err(CommonError::InvalidInput { reason: "cannot be zero address" }.into());
        }
        self.agent_registry.set(new_address);
        Ok(())
    }

    /// Updates the CreditManager address. Admin only.
    pub fn set_credit_manager(&mut self, new_address: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();
        if caller != self.admin.get() {
            return Err(CommonError::NotAdmin { caller }.into());
        }
        if new_address == Address::ZERO {
            return Err(CommonError::InvalidInput { reason: "cannot be zero address" }.into());
        }
        self.credit_manager.set(new_address);
        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // CORE LOGIC
    // ════════════════════════════════════════════════════════════════════════

    /// Links a memory to an agent.
    pub fn link_memory(
        &mut self,
        agent_id: FixedBytes<32>,
        memory_id: FixedBytes<32>,
        priority: u8,
    ) -> Result<FixedBytes<32>, String> {
        self.require_not_paused()?;

        let caller = self.vm().msg_sender();

        // CROSS-CONTRACT: Verify memory exists
        let memory_registry_addr = self.memory_registry.get();
        let memory_registry = IMemoryRegistry::new(memory_registry_addr);
        let (memory_owner, ..) = memory_registry
            .get_memory(self.vm(), Call::new(), memory_id)
            .map_err(|_| ContextError::MemoryNotFound)?;

        if memory_owner == Address::ZERO {
            return Err(ContextError::MemoryNotFound.into());
        }

        // CROSS-CONTRACT: Verify agent exists
        let agent_registry_addr = self.agent_registry.get();
        let agent_registry = IAgentRegistry::new(agent_registry_addr);
        let (agent_owner, ..) = agent_registry
            .get_agent(self.vm(), Call::new(), agent_id)
            .map_err(|_| ContextError::AgentNotFound)?;

        if agent_owner == Address::ZERO {
            return Err(ContextError::AgentNotFound.into());
        }

        // Verify caller owns both memory and agent
        if memory_owner != caller {
            return Err(CommonError::NotOwner { caller, owner: memory_owner }.into());
        }
        if agent_owner != caller {
            return Err(CommonError::NotOwner { caller, owner: agent_owner }.into());
        }

        // CROSS-CONTRACT CALL: Charge credits for linking (single call)
        let credit_manager_addr = self.credit_manager.get();
        let credit_manager = ICreditManager::new(credit_manager_addr);

        let ctx = Call::new_mutating(self);
        credit_manager
            .consume_credits_for_op(self.vm(), ctx, caller, OP_LINK_MEMORY)
            .map_err(|_| ContextError::CrossContractCallFailed)?;

        // Check if link already exists
        let existing_id: FixedBytes<32> =
            self.agent_memory_link.getter(agent_id).getter(memory_id).get();

        if existing_id != FixedBytes::ZERO {
            if !self.context_enabled.get(existing_id) {
                self.context_enabled.setter(existing_id).set(true);
                let mut ctx = self.contexts.setter(existing_id);
                ctx.enabled.set(true);
                ctx.priority.set(Uint::from(priority));

                self.vm().log(LinkEnabled {
                    context_id: existing_id,
                });

                return Ok(existing_id);
            }
            return Err(ContextError::AlreadyLinked.into());
        }

        let nonce = self.nonces.get(caller);
        let context_id = generate_id(self.vm(), caller, nonce);
        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut ctx = self.contexts.setter(context_id);
        ctx.context_id.set(context_id);
        ctx.agent_id.set(agent_id);
        ctx.memory_id.set(memory_id);
        ctx.priority.set(Uint::from(priority));
        ctx.enabled.set(true);
        ctx.created_at.set(timestamp);

        self.agent_memory_link
            .setter(agent_id)
            .setter(memory_id)
            .set(context_id);

        self.context_enabled.setter(context_id).set(true);

        // Store context_id in agent's list
        let context_count: Uint<256, 4> = self.agent_context_count.get(agent_id);
        self.agent_contexts.setter(agent_id).setter(context_count).set(context_id);
        self.agent_context_count.setter(agent_id).set(context_count + U256::from(1));

        self.nonces.setter(caller).set(nonce + U256::from(1));

        self.vm().log(ContextLinked {
            context_id,
            agent_id,
            memory_id,
            priority,
        });

        Ok(context_id)
    }

    /// Unlinks a memory from an agent.
    pub fn unlink_memory(
        &mut self,
        agent_id: FixedBytes<32>,
        memory_id: FixedBytes<32>,
    ) -> Result<(), String> {
        self.require_not_paused()?;

        let context_id: FixedBytes<32> =
            self.agent_memory_link.getter(agent_id).getter(memory_id).get();

        if context_id == FixedBytes::ZERO {
            return Err(ContextError::LinkNotFound.into());
        }

        self.require_owner(agent_id, memory_id)?;

        self.agent_memory_link
            .setter(agent_id)
            .setter(memory_id)
            .set(FixedBytes::ZERO);

        self.context_enabled.setter(context_id).set(false);
        self.contexts.setter(context_id).enabled.set(false);

        self.vm().log(ContextUnlinked {
            context_id,
            agent_id,
            memory_id,
        });

        Ok(())
    }

    /// Changes the priority of a link.
    pub fn change_priority(
        &mut self,
        context_id: FixedBytes<32>,
        new_priority: u8,
    ) -> Result<(), String> {
        self.require_not_paused()?;

        if !self.context_enabled.get(context_id) {
            return Err(ContextError::LinkNotActive.into());
        }

        self.require_context_owner(context_id)?;

        self.contexts.setter(context_id).priority.set(Uint::from(new_priority));

        self.vm().log(PriorityChanged {
            context_id,
            new_priority,
        });

        Ok(())
    }

    /// Disables a link without deleting it.
    pub fn disable_link(&mut self, context_id: FixedBytes<32>) -> Result<(), String> {
        self.require_not_paused()?;

        if !self.context_enabled.get(context_id) {
            return Err(ContextError::AlreadyDisabled.into());
        }

        self.require_context_owner(context_id)?;

        self.context_enabled.setter(context_id).set(false);
        self.contexts.setter(context_id).enabled.set(false);

        self.vm().log(LinkDisabled {
            context_id,
        });

        Ok(())
    }

    /// Re-enables a disabled link.
    pub fn enable_link(&mut self, context_id: FixedBytes<32>) -> Result<(), String> {
        self.require_not_paused()?;

        if self.context_enabled.get(context_id) {
            return Err(ContextError::AlreadyEnabled.into());
        }

        self.require_context_owner(context_id)?;

        self.context_enabled.setter(context_id).set(true);
        self.contexts.setter(context_id).enabled.set(true);

        self.vm().log(LinkEnabled {
            context_id,
        });

        Ok(())
    }

    // ════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ════════════════════════════════════════════════════════════════════════

    fn require_owner(&self, agent_id: FixedBytes<32>, memory_id: FixedBytes<32>) -> Result<(), String> {
        let caller = self.vm().msg_sender();

        let memory_registry_addr = self.memory_registry.get();
        let memory_registry = IMemoryRegistry::new(memory_registry_addr);
        let (memory_owner, ..) = memory_registry
            .get_memory(self.vm(), Call::new(), memory_id)
            .map_err(|_| ContextError::CrossContractCallFailed)?;

        if caller == memory_owner {
            return Ok(());
        }

        let agent_registry_addr = self.agent_registry.get();
        let agent_registry = IAgentRegistry::new(agent_registry_addr);
        let (agent_owner, ..) = agent_registry
            .get_agent(self.vm(), Call::new(), agent_id)
            .map_err(|_| ContextError::CrossContractCallFailed)?;

        if caller == agent_owner {
            return Ok(());
        }

        Err(CommonError::NotOwner { caller, owner: agent_owner }.into())
    }

    fn require_context_owner(&self, context_id: FixedBytes<32>) -> Result<(), String> {
        let ctx = self.contexts.getter(context_id);
        let agent_id = ctx.agent_id.get();
        let memory_id = ctx.memory_id.get();
        self.require_owner(agent_id, memory_id)
    }

    // ════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ════════════════════════════════════════════════════════════════════════

    pub fn get_link(
        &self,
        agent_id: FixedBytes<32>,
        memory_id: FixedBytes<32>,
    ) -> FixedBytes<32> {
        self.agent_memory_link.getter(agent_id).getter(memory_id).get()
    }

    pub fn get_context(
        &self,
        context_id: FixedBytes<32>,
    ) -> Result<(FixedBytes<32>, FixedBytes<32>, u8, bool, u64), String> {
        let ctx = self.contexts.getter(context_id);

        if ctx.agent_id.get() == FixedBytes::ZERO {
            return Err(ContextError::LinkNotFound.into());
        }

        Ok((
            ctx.agent_id.get(),
            ctx.memory_id.get(),
            u8::try_from(ctx.priority.get()).unwrap_or(0),
            ctx.enabled.get(),
            u64::try_from(ctx.created_at.get()).unwrap_or(0),
        ))
    }

    pub fn get_agent_context_count(&self, agent_id: FixedBytes<32>) -> U256 {
        self.agent_context_count.get(agent_id)
    }

    pub fn get_agent_context_by_index(
        &self,
        agent_id: FixedBytes<32>,
        index: U256,
    ) -> Result<FixedBytes<32>, String> {
        let count = self.agent_context_count.get(agent_id);
        if index >= count {
            return Err(String::from("ContextRegistry: index out of bounds"));
        }
        Ok(self.agent_contexts.getter(agent_id).getter(index).get())
    }

    pub fn get_nonce(&self, owner: Address) -> U256 {
        self.nonces.get(owner)
    }

    pub fn admin(&self) -> Address {
        self.admin.get()
    }

    pub fn memory_registry(&self) -> Address {
        self.memory_registry.get()
    }

    pub fn agent_registry(&self) -> Address {
        self.agent_registry.get()
    }

    pub fn credit_manager(&self) -> Address {
        self.credit_manager.get()
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

    fn setup() -> (TestVM, ContextRegistry) {
        let vm = TestVM::default();
        let mut contract = ContextRegistry::from(&vm);
        let memory_registry = Address::new([0x22; 20]);
        let agent_registry = Address::new([0x33; 20]);
        let credit_manager = Address::new([0x44; 20]);
        contract.initialize(memory_registry, agent_registry, credit_manager);
        (vm, contract)
    }

    #[test]
    fn test_initialize() {
        let (_vm, contract) = setup();
        assert_eq!(contract.admin(), DEFAULT_SENDER);
    }

    #[test]
    fn test_get_context_not_found() {
        let (_vm, contract) = setup();
        let fake_id = FixedBytes::from([0x01; 32]);
        assert!(contract.get_context(fake_id).is_err());
    }

    #[test]
    fn test_get_link_not_found() {
        let (_vm, contract) = setup();
        let fake_agent = FixedBytes::from([0x01; 32]);
        let fake_memory = FixedBytes::from([0x02; 32]);
        let result = contract.get_link(fake_agent, fake_memory);
        assert_eq!(result, FixedBytes::ZERO);
    }

    #[test]
    fn test_change_priority_not_active() {
        let (_vm, mut contract) = setup();
        let fake_id = FixedBytes::from([0x01; 32]);
        assert!(contract.change_priority(fake_id, 10).is_err());
    }

    #[test]
    fn test_pausable() {
        let (_vm, mut contract) = setup();
        assert!(!contract.is_paused());
        contract.pause().unwrap();
        assert!(contract.is_paused());
        assert!(contract.disable_link(FixedBytes::from([0x01; 32])).is_err());
        contract.unpause().unwrap();
        assert!(!contract.is_paused());
    }
}
