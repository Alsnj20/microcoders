//! ContextRegistry Contract
//!
//! Manages many-to-many relationships between agents and memories.
//! This is the CORE of the protocol.
//!
//! Cross-contract calls:
//! - Verifies memory exists via MemoryRegistry
//! - Verifies agent exists via AgentRegistry

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, FixedBytes, Uint, U256};
use memorychain_common::{
    events::*,
    helpers::generate_id,
    interfaces::{IMemoryRegistry, IAgentRegistry},
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
        address admin;
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
    /// Initializes the contract with MemoryRegistry and AgentRegistry addresses.
    pub fn initialize(
        &mut self,
        memory_registry: Address,
        agent_registry: Address,
    ) {
        if self.admin.get() == Address::ZERO {
            self.admin.set(self.vm().msg_sender());
            self.memory_registry.set(memory_registry);
            self.agent_registry.set(agent_registry);
        }
    }

    /// Links a memory to an agent.
    ///
    /// Cross-contract: Verifies both memory and agent exist.
    pub fn link_memory(
        &mut self,
        agent_id: FixedBytes<32>,
        memory_id: FixedBytes<32>,
        priority: u8,
    ) -> Result<FixedBytes<32>, String> {
        let caller = self.vm().msg_sender();

        // CROSS-CONTRACT: Verify memory exists
        let memory_registry_addr = self.memory_registry.get();
        let memory_registry = IMemoryRegistry::new(memory_registry_addr);
        let (memory_owner, _, _, _, _, _, _) = memory_registry
            .get_memory(self.vm(), Call::new(), memory_id)
            .map_err(|_| String::from("ContextRegistry: memory not found"))?;

        if memory_owner == Address::ZERO {
            return Err(String::from("ContextRegistry: memory does not exist"));
        }

        // CROSS-CONTRACT: Verify agent exists
        let agent_registry_addr = self.agent_registry.get();
        let agent_registry = IAgentRegistry::new(agent_registry_addr);
        let (agent_owner, _, _, _, _, _, _, _, _) = agent_registry
            .get_agent(self.vm(), Call::new(), agent_id)
            .map_err(|_| String::from("ContextRegistry: agent not found"))?;

        if agent_owner == Address::ZERO {
            return Err(String::from("ContextRegistry: agent does not exist"));
        }

        // Verify caller owns both memory and agent
        if memory_owner != caller {
            return Err(String::from("ContextRegistry: not memory owner"));
        }
        if agent_owner != caller {
            return Err(String::from("ContextRegistry: not agent owner"));
        }

        // Check if link already exists
        let existing_id: FixedBytes<32> =
            self.agent_memory_link.getter(agent_id).getter(memory_id).get();

        if existing_id != FixedBytes::ZERO {
            if !self.context_enabled.get(existing_id) {
                self.context_enabled.setter(existing_id).set(true);
                let mut ctx = self.contexts.setter(existing_id);
                ctx.enabled.set(true);
                ctx.priority.set(Uint::from(priority));
                return Ok(existing_id);
            }
            return Err(String::from("ContextRegistry: already linked"));
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
        let context_id: FixedBytes<32> =
            self.agent_memory_link.getter(agent_id).getter(memory_id).get();

        if context_id == FixedBytes::ZERO {
            return Err(String::from("ContextRegistry: link not found"));
        }

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
        if !self.context_enabled.get(context_id) {
            return Err(String::from("ContextRegistry: link not active"));
        }

        self.contexts.setter(context_id).priority.set(Uint::from(new_priority));

        self.vm().log(PriorityChanged {
            context_id,
            new_priority,
        });

        Ok(())
    }

    /// Disables a link without deleting it.
    pub fn disable_link(&mut self, context_id: FixedBytes<32>) -> Result<(), String> {
        if !self.context_enabled.get(context_id) {
            return Err(String::from("ContextRegistry: already disabled"));
        }

        self.context_enabled.setter(context_id).set(false);
        self.contexts.setter(context_id).enabled.set(false);

        self.vm().log(LinkDisabled {
            context_id,
        });

        Ok(())
    }

    /// Re-enables a disabled link.
    pub fn enable_link(&mut self, context_id: FixedBytes<32>) -> Result<(), String> {
        if self.context_enabled.get(context_id) {
            return Err(String::from("ContextRegistry: already enabled"));
        }

        self.context_enabled.setter(context_id).set(true);
        self.contexts.setter(context_id).enabled.set(true);

        self.vm().log(LinkEnabled {
            context_id,
        });

        Ok(())
    }

    /// Returns the context_id for an agent-memory link.
    pub fn get_link(
        &self,
        agent_id: FixedBytes<32>,
        memory_id: FixedBytes<32>,
    ) -> FixedBytes<32> {
        self.agent_memory_link.getter(agent_id).getter(memory_id).get()
    }

    /// Returns link data by context_id.
    pub fn get_context(
        &self,
        context_id: FixedBytes<32>,
    ) -> Result<(FixedBytes<32>, FixedBytes<32>, u8, bool, u64), String> {
        let ctx = self.contexts.getter(context_id);

        if ctx.agent_id.get() == FixedBytes::ZERO {
            return Err(String::from("ContextRegistry: not found"));
        }

        Ok((
            ctx.agent_id.get(),
            ctx.memory_id.get(),
            u8::try_from(ctx.priority.get()).unwrap_or(0),
            ctx.enabled.get(),
            u64::try_from(ctx.created_at.get()).unwrap_or(0),
        ))
    }

    /// Returns the admin address.
    pub fn admin(&self) -> Address {
        self.admin.get()
    }

    /// Returns the number of contexts (linked memories) for an agent.
    pub fn get_agent_context_count(&self, agent_id: FixedBytes<32>) -> U256 {
        self.agent_context_count.get(agent_id)
    }

    /// Returns a context ID by agent and index.
    pub fn get_agent_context_by_index(&self, agent_id: FixedBytes<32>, index: U256) -> FixedBytes<32> {
        self.agent_contexts.getter(agent_id).getter(index).get()
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
        contract.initialize(memory_registry, agent_registry);
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
}
