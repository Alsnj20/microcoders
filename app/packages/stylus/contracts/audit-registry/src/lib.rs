//! AuditRegistry Contract
//!
//! Maintains verifiable history of the protocol.

#![cfg_attr(not(any(test, feature = "export-abi")), no_main)]
extern crate alloc;

use alloc::string::String;
use alloy_primitives::{Address, FixedBytes, Uint, U256};
use memorychain_common::{
    events::*,
    helpers::generate_id,
};
use stylus_sdk::prelude::*;

sol_storage! {
    #[entrypoint]
    pub struct AuditRegistry {
        mapping(bytes32 => AuditEvent) events;
        uint256 total_events;
        mapping(address => uint256) nonces;
        address admin;
        mapping(address => bool) authorized_recorders;
    }

    pub struct AuditEvent {
        bytes32 event_id;
        address actor;
        uint8 entity_type;
        bytes32 entity_id;
        uint8 action;
        uint64 timestamp;
    }
}

#[public]
impl AuditRegistry {
    /// Initializes the contract.
    pub fn initialize(&mut self) {
        if self.admin.get() == Address::ZERO {
            self.admin.set(self.vm().msg_sender());
        }
    }

    /// Records an audit event.
    pub fn record_audit(
        &mut self,
        actor: Address,
        entity_type: u8,
        entity_id: FixedBytes<32>,
        action: u8,
    ) -> Result<FixedBytes<32>, String> {
        let caller = self.vm().msg_sender();

        if !self.authorized_recorders.get(caller) && caller != self.admin.get() {
            return Err(String::from("AuditRegistry: unauthorized recorder"));
        }

        let nonce = self.nonces.get(caller);
        let event_id = generate_id(self.vm(), caller, nonce);
        let timestamp = Uint::from(self.vm().block_timestamp());

        let mut event = self.events.setter(event_id);
        event.event_id.set(event_id);
        event.actor.set(actor);
        event.entity_type.set(Uint::from(entity_type));
        event.entity_id.set(entity_id);
        event.action.set(Uint::from(action));
        event.timestamp.set(timestamp);

        self.nonces.setter(caller).set(nonce + U256::from(1));
        self.total_events.set(self.total_events.get() + U256::from(1));

        self.vm().log(AuditRecorded {
            event_id,
            actor,
            entity_type,
            entity_id,
            action,
            timestamp: u64::try_from(timestamp).unwrap_or(0),
        });

        Ok(event_id)
    }

    /// Returns audit event data.
    pub fn get_audit_event(
        &self,
        event_id: FixedBytes<32>,
    ) -> Result<(Address, u8, FixedBytes<32>, u8, u64), String> {
        let event = self.events.getter(event_id);

        if event.actor.get() == Address::ZERO {
            return Err(String::from("AuditRegistry: event not found"));
        }

        Ok((
            event.actor.get(),
            u8::try_from(event.entity_type.get()).unwrap_or(0),
            event.entity_id.get(),
            u8::try_from(event.action.get()).unwrap_or(0),
            u64::try_from(event.timestamp.get()).unwrap_or(0),
        ))
    }

    /// Returns the total number of recorded events.
    pub fn total_events(&self) -> U256 {
        self.total_events.get()
    }

    /// Authorizes a contract to record events. Admin only.
    pub fn authorize_recorder(&mut self, recorder: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();

        if caller != self.admin.get() {
            return Err(String::from("AuditRegistry: only admin"));
        }

        self.authorized_recorders.setter(recorder).set(true);

        Ok(())
    }

    /// Revokes authorization from a recorder. Admin only.
    pub fn revoke_recorder(&mut self, recorder: Address) -> Result<(), String> {
        let caller = self.vm().msg_sender();

        if caller != self.admin.get() {
            return Err(String::from("AuditRegistry: only admin"));
        }

        self.authorized_recorders.setter(recorder).set(false);

        Ok(())
    }

    /// Returns the admin address.
    pub fn admin(&self) -> Address {
        self.admin.get()
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

    fn setup() -> (TestVM, AuditRegistry) {
        let vm = TestVM::default();
        let mut contract = AuditRegistry::from(&vm);
        contract.initialize();
        (vm, contract)
    }

    #[test]
    fn test_initialize() {
        let (_vm, contract) = setup();
        assert_eq!(contract.admin(), DEFAULT_SENDER);
        assert_eq!(contract.total_events(), U256::from(0));
    }

    #[test]
    fn test_record_audit_by_admin() {
        let (_vm, mut contract) = setup();
        let actor = Address::new([0x02; 20]);
        let entity = FixedBytes::from([0x03; 32]);
        let result = contract.record_audit(actor, 0, entity, 0);
        assert!(result.is_ok());
        assert_eq!(contract.total_events(), U256::from(1));
    }

    #[test]
    fn test_get_event_after_record() {
        let (_vm, mut contract) = setup();
        let actor = Address::new([0x02; 20]);
        let entity = FixedBytes::from([0x03; 32]);
        let event_id = contract.record_audit(actor, 1, entity, 2).unwrap();
        
        let (recorded_actor, entity_type, recorded_entity, action, _timestamp) = 
            contract.get_audit_event(event_id).unwrap();
        
        assert_eq!(recorded_actor, actor);
        assert_eq!(entity_type, 1);
        assert_eq!(recorded_entity, entity);
        assert_eq!(action, 2);
    }

    #[test]
    fn test_get_audit_event_not_found() {
        let (_vm, contract) = setup();
        let fake_id = FixedBytes::from([0x01; 32]);
        assert!(contract.get_audit_event(fake_id).is_err());
    }

    #[test]
    fn test_authorize_recorder() {
        let (_vm, mut contract) = setup();
        let recorder = Address::new([0x01; 20]);
        contract.authorize_recorder(recorder).unwrap();
        // Admin can still record
        let actor = Address::new([0x02; 20]);
        let entity = FixedBytes::from([0x03; 32]);
        let result = contract.record_audit(actor, 0, entity, 0);
        assert!(result.is_ok());
    }
}
