//! Shared error types for MemoryChain contracts.
//!
//! Using enums instead of strings saves gas and provides type safety.

use alloy_primitives::Address;

/// Common errors shared across all contracts.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CommonError {
    /// Caller is not the admin.
    NotAdmin { caller: Address },
    /// Caller is not the owner of the resource.
    NotOwner { caller: Address, owner: Address },
    /// Caller is not registered.
    NotRegistered { caller: Address },
    /// Resource does not exist.
    ResourceNotFound,
    /// Resource is archived and cannot be modified.
    ResourceArchived,
    /// Resource already exists.
    AlreadyExists,
    /// Input validation failed.
    InvalidInput { reason: &'static str },
    /// Contract is paused.
    Paused,
    /// Contract is not paused (when trying to unpause).
    NotPaused,
}

/// Errors specific to CreditManager.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum CreditError {
    /// Insufficient balance for the operation.
    InsufficientBalance { required: u64, available: u64 },
    /// Credit amount must be greater than zero.
    ZeroAmount,
    /// Only authorized contracts can consume credits.
    UnauthorizedConsumer { caller: Address },
    /// Insufficient ETH payment for credit purchase.
    InsufficientPayment { required: u64, provided: u64 },
    /// Purchase amount is outside configured limits.
    PurchaseOutOfRange { min: u64, max: u64, requested: u64 },
}

/// Errors specific to MemoryRegistry.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum MemoryError {
    /// Memory not found.
    NotFound,
    /// Caller does not own this memory.
    NotOwner,
    /// Memory is archived.
    Archived,
    /// Invalid CID (empty).
    InvalidCid,
    /// Invalid hash (zero).
    InvalidHash,
    /// ID collision during generation.
    IdCollision,
    /// Insufficient credits.
    InsufficientCredits,
    /// Credit consumption failed (cross-contract call).
    CreditConsumptionFailed,
}

/// Errors specific to AgentRegistry.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AgentError {
    /// Agent not found.
    NotFound,
    /// Caller does not own this agent.
    NotOwner,
    /// Agent is archived.
    Archived,
    /// Invalid name (empty).
    InvalidName,
    /// Invalid CID (empty).
    InvalidCid,
    /// Invalid hash (zero).
    InvalidHash,
    /// ID collision during generation.
    IdCollision,
    /// Insufficient credits.
    InsufficientCredits,
    /// Credit consumption failed (cross-contract call).
    CreditConsumptionFailed,
}

/// Errors specific to ContextRegistry.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum ContextError {
    /// Link not found.
    LinkNotFound,
    /// Link already exists.
    AlreadyLinked,
    /// Link is not active (disabled).
    LinkNotActive,
    /// Link is already disabled.
    AlreadyDisabled,
    /// Link is already enabled.
    AlreadyEnabled,
    /// Memory does not exist (cross-contract verification).
    MemoryNotFound,
    /// Agent does not exist (cross-contract verification).
    AgentNotFound,
    /// Cross-contract call failed.
    CrossContractCallFailed,
}

/// Errors specific to UserRegistry.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum UserError {
    /// Username is already taken.
    UsernameTaken { username: alloc::string::String },
}

/// Errors specific to AuditRegistry.
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum AuditError {
    /// Only authorized recorders can record events.
    UnauthorizedRecorder { caller: Address },
}

/// Convert error enums to strings for ABI compatibility.
impl From<CommonError> for String {
    fn from(err: CommonError) -> Self {
        match err {
            CommonError::NotAdmin { caller } => {
                alloc::format!("CommonError: not admin ({})", caller)
            }
            CommonError::NotOwner { caller, owner } => {
                alloc::format!("CommonError: not owner (caller={}, owner={})", caller, owner)
            }
            CommonError::NotRegistered { caller } => {
                alloc::format!("CommonError: not registered ({})", caller)
            }
            CommonError::ResourceNotFound => String::from("CommonError: resource not found"),
            CommonError::ResourceArchived => String::from("CommonError: resource archived"),
            CommonError::AlreadyExists => String::from("CommonError: already exists"),
            CommonError::InvalidInput { reason } => {
                alloc::format!("CommonError: invalid input ({})", reason)
            }
            CommonError::Paused => String::from("CommonError: contract is paused"),
            CommonError::NotPaused => String::from("CommonError: contract is not paused"),
        }
    }
}

impl From<CreditError> for String {
    fn from(err: CreditError) -> Self {
        match err {
            CreditError::InsufficientBalance { required, available } => {
                alloc::format!(
                    "CreditError: insufficient balance (need {}, have {})",
                    required,
                    available
                )
            }
            CreditError::ZeroAmount => String::from("CreditError: amount must be > 0"),
            CreditError::UnauthorizedConsumer { caller } => {
                alloc::format!("CreditError: unauthorized consumer ({})", caller)
            }
            CreditError::InsufficientPayment { required, provided } => {
                alloc::format!(
                    "CreditError: insufficient payment (need {} wei, got {} wei)",
                    required,
                    provided
                )
            }
            CreditError::PurchaseOutOfRange { min, max, requested } => {
                alloc::format!(
                    "CreditError: purchase out of range (min={}, max={}, requested={})",
                    min,
                    max,
                    requested
                )
            }
        }
    }
}

impl From<MemoryError> for String {
    fn from(err: MemoryError) -> Self {
        match err {
            MemoryError::NotFound => String::from("MemoryError: not found"),
            MemoryError::NotOwner => String::from("MemoryError: not owner"),
            MemoryError::Archived => String::from("MemoryError: archived"),
            MemoryError::InvalidCid => String::from("MemoryError: empty CID"),
            MemoryError::InvalidHash => String::from("MemoryError: zero hash"),
            MemoryError::IdCollision => String::from("MemoryError: ID collision"),
            MemoryError::InsufficientCredits => String::from("MemoryError: insufficient credits"),
            MemoryError::CreditConsumptionFailed => {
                String::from("MemoryError: credit consumption failed")
            }
        }
    }
}

impl From<AgentError> for String {
    fn from(err: AgentError) -> Self {
        match err {
            AgentError::NotFound => String::from("AgentError: not found"),
            AgentError::NotOwner => String::from("AgentError: not owner"),
            AgentError::Archived => String::from("AgentError: archived"),
            AgentError::InvalidName => String::from("AgentError: empty name"),
            AgentError::InvalidCid => String::from("AgentError: empty CID"),
            AgentError::InvalidHash => String::from("AgentError: zero hash"),
            AgentError::IdCollision => String::from("AgentError: ID collision"),
            AgentError::InsufficientCredits => String::from("AgentError: insufficient credits"),
            AgentError::CreditConsumptionFailed => {
                String::from("AgentError: credit consumption failed")
            }
        }
    }
}

impl From<ContextError> for String {
    fn from(err: ContextError) -> Self {
        match err {
            ContextError::LinkNotFound => String::from("ContextError: link not found"),
            ContextError::AlreadyLinked => String::from("ContextError: already linked"),
            ContextError::LinkNotActive => String::from("ContextError: link not active"),
            ContextError::AlreadyDisabled => String::from("ContextError: already disabled"),
            ContextError::AlreadyEnabled => String::from("ContextError: already enabled"),
            ContextError::MemoryNotFound => String::from("ContextError: memory not found"),
            ContextError::AgentNotFound => String::from("ContextError: agent not found"),
            ContextError::CrossContractCallFailed => {
                String::from("ContextError: cross-contract call failed")
            }
        }
    }
}

impl From<AuditError> for String {
    fn from(err: AuditError) -> Self {
        match err {
            AuditError::UnauthorizedRecorder { caller } => {
                alloc::format!("AuditError: unauthorized recorder ({})", caller)
            }
        }
    }
}

impl From<UserError> for String {
    fn from(err: UserError) -> Self {
        match err {
            UserError::UsernameTaken { username } => {
                alloc::format!("UserError: username already taken ({})", username)
            }
        }
    }
}
