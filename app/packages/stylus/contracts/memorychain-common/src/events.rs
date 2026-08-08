//! Event definitions for MemoryChain contracts.
//!
//! These events are emitted on-chain and can be listened to by the frontend.

use stylus_sdk::alloy_sol_types::sol;

sol! {
    // ── UserRegistry events ───────────────────────────
    event UserRegistered(address indexed owner, string username, uint256 timestamp);
    event UsernameUpdated(address indexed owner, string new_username);
    event UserDeactivated(address indexed owner);
    event UpdaterAuthorized(address indexed updater);
    event UpdaterRevoked(address indexed updater);

    // ── CreditManager events ──────────────────────────
    event CreditsPurchased(address indexed user, uint64 amount, uint64 new_balance);
    event CreditsConsumed(address indexed user, uint64 amount, uint64 new_balance);
    event CreditsRefunded(address indexed user, uint64 amount, uint64 new_balance);

    // ── CreditManager pricing events ──────────────────
    event FeeUpdated(uint8 operation, uint16 old_fee, uint16 new_fee);
    event PricePerCreditUpdated(uint256 old_price, uint256 new_price);
    event TreasuryUpdated(address indexed old_treasury, address indexed new_treasury);
    event TestnetModeUpdated(bool is_testnet);
    event PurchaseLimitsUpdated(uint256 min, uint256 max);
    event ConsumerAuthorized(address indexed consumer);
    event ConsumerRevoked(address indexed consumer);

    // ── Pausable events ───────────────────────────────
    event ContractPaused(address indexed admin);
    event ContractUnpaused(address indexed admin);

    // ── Admin transfer events ─────────────────────────
    event AdminTransferProposed(address indexed current_admin, address indexed new_admin);
    event AdminTransferCompleted(address indexed old_admin, address indexed new_admin);

    // ── MemoryRegistry events ─────────────────────────
    event MemoryCreated(bytes32 indexed memory_id, address indexed owner, string cid, bytes32 hash, uint8 memory_type, uint8 visibility);
    event MemoryUpdated(bytes32 indexed memory_id, address indexed owner, string new_cid, bytes32 new_hash, uint32 new_version);
    event MemoryArchived(bytes32 indexed memory_id, address indexed owner);
    event MemoryRestored(bytes32 indexed memory_id, address indexed owner);

    // ── AgentRegistry events ──────────────────────────
    event AgentCreated(bytes32 indexed agent_id, address indexed owner, string cid, bytes32 hash);
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
    event RecorderAuthorized(address indexed recorder);
    event RecorderRevoked(address indexed recorder);
}
