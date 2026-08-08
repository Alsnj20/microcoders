//! Shared types for MemoryChain contracts.

use alloy_primitives::FixedBytes;

/// 32-byte identifier used for memories, agents, contexts, and audit events.
pub type Bytes32 = FixedBytes<32>;

/// Status of a user account.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum UserStatus {
    Inactive = 0,
    Active = 1,
}

/// Status of a memory or agent resource.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum ResourceStatus {
    Active = 0,
    Archived = 1,
}

/// Visibility level for memories.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum Visibility {
    Private = 0,
    Public = 1,
    Restricted = 2,
}

impl Visibility {
    /// Returns the maximum valid visibility value.
    pub fn max_value() -> u8 {
        Visibility::Restricted as u8
    }
}

/// Category of a memory.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum MemoryType {
    Preference = 0,
    Knowledge = 1,
    Document = 2,
    Objective = 3,
    Other = 4,
}

impl MemoryType {
    /// Returns the maximum valid memory type value.
    pub fn max_value() -> u8 {
        MemoryType::Other as u8
    }
}

/// Category of an agent.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum AgentType {
    General = 0,
    Coder = 1,
    Writer = 2,
    Analyst = 3,
    Researcher = 4,
    Custom = 5,
}

/// Entity type for audit trail.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum EntityType {
    User = 0,
    Memory = 1,
    Agent = 2,
    Context = 3,
    Credits = 4,
}

/// Action type for audit trail.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum AuditAction {
    Create = 0,
    Update = 1,
    Archive = 2,
    Restore = 3,
    Link = 4,
    Unlink = 5,
    Purchase = 6,
    Consume = 7,
    Refund = 8,
}

// ══════════════════════════════════════════════════════════════════════════════
// Operation codes for CreditManager.get_fee()
// ══════════════════════════════════════════════════════════════════════════════

/// User registration operation.
pub const OP_REGISTER_USER: u8 = 0;
/// Memory creation operation.
pub const OP_CREATE_MEMORY: u8 = 1;
/// Memory update operation.
pub const OP_UPDATE_MEMORY: u8 = 2;
/// Agent creation operation.
pub const OP_CREATE_AGENT: u8 = 3;
/// Agent update operation.
pub const OP_UPDATE_AGENT: u8 = 4;
/// Agent execution operation (reserved).
pub const OP_EXECUTE_AGENT: u8 = 5;
/// Memory linking operation.
pub const OP_LINK_MEMORY: u8 = 6;
