//! Event definitions for MemoryChain contracts.
//!
//! These events are emitted on-chain and can be listened to by the frontend.

use stylus_sdk::alloy_sol_types::sol;

sol! {
    // ── UserRegistry events ───────────────────────────
    event UserRegistered(address indexed owner, string username, uint256 timestamp);
    event UsernameUpdated(address indexed owner, string new_username);
    event UserDeactivated(address indexed owner);

    // ── CreditManager events ──────────────────────────
    event CreditsPurchased(address indexed user, uint64 amount, uint64 new_balance);
    event CreditsConsumed(address indexed user, uint64 amount, uint64 new_balance);
    event CreditsRefunded(address indexed user, uint64 amount, uint64 new_balance);
    event FeesUpdated(uint16 create_memory, uint16 update_memory, uint16 create_agent, uint16 update_agent, uint16 execute_agent);

    // ── MemoryRegistry events ─────────────────────────
    event MemoryCreated(bytes32 indexed memory_id, address indexed owner, string cid, bytes32 hash, uint8 memory_type, uint8 visibility);
    event MemoryUpdated(bytes32 indexed memory_id, address indexed owner, string new_cid, bytes32 new_hash, uint32 new_version);
    event MemoryArchived(bytes32 indexed memory_id, address indexed owner);
    event MemoryRestored(bytes32 indexed memory_id, address indexed owner);

    // ── AgentRegistry events ──────────────────────────
    event AgentCreated(bytes32 indexed agent_id, address indexed owner, string name, string cid, bytes32 hash);
    event AgentUpdated(bytes32 indexed agent_id, address indexed owner, string new_cid, bytes32 new_hash, uint32 new_version);
    event AgentArchived(bytes32 indexed agent_id, address indexed owner);
    event AgentRestored(bytes32 indexed agent_id, address indexed owner);

    // ── ContextRegistry events ────────────────────────
    event ContextLinked(bytes32 indexed context_id, bytes32 indexed agent_id, bytes32 indexed memory_id, uint8 priority);
    event ContextUnlinked(bytes32 indexed context_id, bytes32 indexed agent_id, bytes32 indexed memory_id);
    event PriorityChanged(bytes32 indexed context_id, uint8 new_priority);
    event LinkDisabled(bytes32 indexed context_id);
    event LinkEnabled(bytes32 indexed context_id);

    // ── AuditRegistry events ──────────────────────────
    event AuditRecorded(bytes32 indexed event_id, address indexed actor, uint8 entity_type, bytes32 indexed entity_id, uint8 action, uint64 timestamp);
}
