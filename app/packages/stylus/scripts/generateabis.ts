import * as fs from "fs";
import * as path from "path";

/**
 * ABI definitions for all MemoryChain contracts.
 *
 * Stylus SDK converts Rust snake_case → Solidity camelCase in ABI selectors.
 * These ABIs are derived from the #[public] impl blocks in each contract's lib.rs.
 */

interface AbiInput {
  name: string;
  type: string;
  indexed?: boolean;
}

interface AbiOutput {
  name?: string;
  type: string;
}

interface AbiItem {
  type: string;
  name?: string;
  inputs?: AbiInput[];
  outputs?: AbiOutput[];
  stateMutability: string;
  anonymous?: boolean;
}

const COMMON_ERRORS: AbiItem[] = [
  { type: "error", name: "Error", inputs: [{ name: "message", type: "string" }], stateMutability: "nonpayable" },
  { type: "error", name: "Panic", inputs: [{ name: "code", type: "uint256" }], stateMutability: "nonpayable" },
  { type: "error", name: "NotAdmin", inputs: [{ name: "caller", type: "address" }], stateMutability: "nonpayable" },
  { type: "error", name: "NotOwner", inputs: [{ name: "caller", type: "address" }, { name: "owner", type: "address" }], stateMutability: "nonpayable" },
  { type: "error", name: "NotRegistered", inputs: [{ name: "caller", type: "address" }], stateMutability: "nonpayable" },
  { type: "error", name: "ResourceNotFound", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "ResourceArchived", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "AlreadyExists", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "InvalidInput", inputs: [{ name: "reason", type: "string" }], stateMutability: "nonpayable" },
  { type: "error", name: "Paused", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "NotPaused", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "InsufficientBalance", inputs: [{ name: "required", type: "uint64" }, { name: "available", type: "uint64" }], stateMutability: "nonpayable" },
  { type: "error", name: "ZeroAmount", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "UnauthorizedConsumer", inputs: [{ name: "caller", type: "address" }], stateMutability: "nonpayable" },
  { type: "error", name: "InsufficientPayment", inputs: [{ name: "required", type: "uint64" }, { name: "provided", type: "uint64" }], stateMutability: "nonpayable" },
  { type: "error", name: "PurchaseOutOfRange", inputs: [{ name: "min", type: "uint64" }, { name: "max", type: "uint64" }, { name: "requested", type: "uint64" }], stateMutability: "nonpayable" },
  { type: "error", name: "NotFound", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "Archived", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "NotArchived", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "InvalidName", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "InvalidCid", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "InvalidHash", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "IdCollision", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "InsufficientCredits", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "CreditConsumptionFailed", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "LinkNotFound", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "AlreadyLinked", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "LinkNotActive", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "AlreadyDisabled", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "AlreadyEnabled", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "MemoryNotFound", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "AgentNotFound", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "CrossContractCallFailed", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "UsernameTaken", inputs: [{ name: "username", type: "string" }], stateMutability: "nonpayable" },
  { type: "error", name: "UnauthorizedRecorder", inputs: [{ name: "caller", type: "address" }], stateMutability: "nonpayable" },
  { type: "error", name: "ProgramNotActivated", inputs: [], stateMutability: "nonpayable" },
  { type: "error", name: "FailedOp", inputs: [{ name: "opIndex", type: "uint256" }, { name: "reason", type: "string" }], stateMutability: "nonpayable" },
];

// ── CreditManager ──────────────────────────────────────────────────────────

const CREDIT_MANAGER_ABI: AbiItem[] = [
  ...COMMON_ERRORS,
  { type: "function", name: "initialize", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "unpause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "isPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  {
    type: "function",
    name: "proposeAdmin",
    inputs: [{ name: "newAdmin", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "acceptAdmin", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pendingAdmin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "initializeNetwork",
    inputs: [
      { name: "isTestnet", type: "bool" },
      { name: "treasury", type: "address" },
      { name: "pricePerCredit", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "buyCredits",
    inputs: [{ name: "amount", type: "uint64" }],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "consumeCredits",
    inputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "consumeCreditsForOp",
    inputs: [
      { name: "user", type: "address" },
      { name: "operation", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "refundCredits",
    inputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setFee",
    inputs: [
      { name: "operation", type: "uint8" },
      { name: "fee", type: "uint16" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setPricePerCredit",
    inputs: [{ name: "priceWei", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setTreasury",
    inputs: [{ name: "treasury", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setPurchaseLimits",
    inputs: [
      { name: "min", type: "uint64" },
      { name: "max", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setTestnetMode",
    inputs: [{ name: "isTestnet", type: "bool" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "authorizeConsumer",
    inputs: [{ name: "consumer", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeConsumer",
    inputs: [{ name: "consumer", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "balanceOf",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint64" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalPurchased",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint64" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "totalSpent",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint64" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "hasSufficientCredits",
    inputs: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint64" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getFee",
    inputs: [{ name: "operation", type: "uint8" }],
    outputs: [{ type: "uint16" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getFees",
    inputs: [],
    outputs: [
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint16" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPricing",
    inputs: [],
    outputs: [
      { type: "bool" },
      { type: "address" },
      { type: "uint256" },
      { type: "uint256" },
      { type: "uint256" },
    ],
    stateMutability: "view",
  },
  { type: "function", name: "isTestnet", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  { type: "function", name: "getTreasury", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "getPricePerCredit", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "admin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
];

// ── UserRegistry ───────────────────────────────────────────────────────────

const USER_REGISTRY_ABI: AbiItem[] = [
  ...COMMON_ERRORS,
  { type: "function", name: "initialize", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "unpause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "isPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  {
    type: "function",
    name: "proposeAdmin",
    inputs: [{ name: "newAdmin", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "acceptAdmin", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pendingAdmin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "registerUser",
    inputs: [{ name: "username", type: "string" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateUsername",
    inputs: [{ name: "newUsername", type: "string" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "deactivateUser", inputs: [], outputs: [], stateMutability: "nonpayable" },
  {
    type: "function",
    name: "incrementAgents",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "incrementMemories",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "authorizeUpdater",
    inputs: [{ name: "updater", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeUpdater",
    inputs: [{ name: "updater", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "exists",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isRegistered",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getUsername",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isActive",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
  { type: "function", name: "totalUsers", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  {
    type: "function",
    name: "getAgentCount",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMemoryCount",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "incrementChats",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "decrementChats",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getChatCount",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint32" }],
    stateMutability: "view",
  },
  { type: "function", name: "admin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
];

// ── MemoryRegistry ─────────────────────────────────────────────────────────

const MEMORY_REGISTRY_ABI: AbiItem[] = [
  ...COMMON_ERRORS,
  {
    type: "function",
    name: "initialize",
    inputs: [
      { name: "creditManager", type: "address" },
      { name: "userRegistry", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "unpause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "isPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  {
    type: "function",
    name: "proposeAdmin",
    inputs: [{ name: "newAdmin", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "acceptAdmin", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pendingAdmin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "createMemory",
    inputs: [
      { name: "name", type: "string" },
      { name: "cid", type: "string" },
      { name: "hash", type: "bytes32" },
      { name: "memoryType", type: "uint8" },
      { name: "vis", type: "uint8" },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateMemory",
    inputs: [
      { name: "memoryId", type: "bytes32" },
      { name: "newCid", type: "string" },
      { name: "newHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "archiveMemory",
    inputs: [{ name: "memoryId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "restoreMemory",
    inputs: [{ name: "memoryId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getMemory",
    inputs: [{ name: "memoryId", type: "bytes32" }],
    outputs: [
      { type: "address" },
      { type: "uint32" },
      { type: "string" },
      { type: "bytes32" },
      { type: "string" },
      { type: "uint8" },
      { type: "uint8" },
      { type: "uint8" },
    ],
    stateMutability: "view",
  },
  { type: "function", name: "totalMemories", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "creditManager", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "admin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "getMemoryCountByOwner",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getMemoryByOwnerIndex",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
];

// ── AgentRegistry ──────────────────────────────────────────────────────────

const AGENT_REGISTRY_ABI: AbiItem[] = [
  ...COMMON_ERRORS,
  {
    type: "function",
    name: "initialize",
    inputs: [
      { name: "creditManager", type: "address" },
      { name: "userRegistry", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "unpause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "isPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  {
    type: "function",
    name: "proposeAdmin",
    inputs: [{ name: "newAdmin", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "acceptAdmin", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pendingAdmin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "createAgent",
    inputs: [
      { name: "name", type: "string" },
      { name: "cid", type: "string" },
      { name: "hash", type: "bytes32" },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateAgent",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "newCid", type: "string" },
      { name: "newHash", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "archiveAgent",
    inputs: [{ name: "agentId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "restoreAgent",
    inputs: [{ name: "agentId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAgent",
    inputs: [{ name: "agentId", type: "bytes32" }],
    outputs: [
      { type: "address" },
      { type: "uint32" },
      { type: "string" },
      { type: "bytes32" },
      { type: "string" },
      { type: "uint8" },
      { type: "uint64" },
      { type: "uint64" },
    ],
    stateMutability: "view",
  },
  { type: "function", name: "totalAgents", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "admin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "getAgentCountByOwner",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAgentByOwnerIndex",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
];

// ── ContextRegistry ────────────────────────────────────────────────────────

const CONTEXT_REGISTRY_ABI: AbiItem[] = [
  ...COMMON_ERRORS,
  {
    type: "function",
    name: "initialize",
    inputs: [
      { name: "memoryRegistry", type: "address" },
      { name: "agentRegistry", type: "address" },
      { name: "creditManager", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "unpause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "isPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  {
    type: "function",
    name: "proposeAdmin",
    inputs: [{ name: "newAdmin", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "acceptAdmin", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pendingAdmin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "linkMemory",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "memoryId", type: "bytes32" },
      { name: "priority", type: "uint8" },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "unlinkMemory",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "memoryId", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "changePriority",
    inputs: [
      { name: "contextId", type: "bytes32" },
      { name: "newPriority", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "disableLink",
    inputs: [{ name: "contextId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "enableLink",
    inputs: [{ name: "contextId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getLink",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "memoryId", type: "bytes32" },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getContext",
    inputs: [{ name: "contextId", type: "bytes32" }],
    outputs: [
      { type: "bytes32" },
      { type: "bytes32" },
      { type: "uint8" },
      { type: "bool" },
      { type: "uint64" },
    ],
    stateMutability: "view",
  },
  { type: "function", name: "admin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "getAgentContextCount",
    inputs: [{ name: "agentId", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getAgentContextByIndex",
    inputs: [
      { name: "agentId", type: "bytes32" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
];

// ── AuditRegistry ──────────────────────────────────────────────────────────

const AUDIT_REGISTRY_ABI: AbiItem[] = [
  ...COMMON_ERRORS,
  { type: "function", name: "initialize", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "unpause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "isPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  {
    type: "function",
    name: "proposeAdmin",
    inputs: [{ name: "newAdmin", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "acceptAdmin", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pendingAdmin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "recordAudit",
    inputs: [
      { name: "actor", type: "address" },
      { name: "entityType", type: "uint8" },
      { name: "entityId", type: "bytes32" },
      { name: "action", type: "uint8" },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getAuditEvent",
    inputs: [{ name: "eventId", type: "bytes32" }],
    outputs: [
      { type: "address" },
      { type: "uint8" },
      { type: "bytes32" },
      { type: "uint8" },
      { type: "uint64" },
    ],
    stateMutability: "view",
  },
  { type: "function", name: "totalEvents", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  {
    type: "function",
    name: "authorizeRecorder",
    inputs: [{ name: "recorder", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokeRecorder",
    inputs: [{ name: "recorder", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "admin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
];

// ── ChatRegistry ──────────────────────────────────────────────────────────

const CHAT_REGISTRY_ABI: AbiItem[] = [
  ...COMMON_ERRORS,
  {
    type: "function",
    name: "initialize",
    inputs: [
      { name: "creditManager", type: "address" },
      { name: "userRegistry", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "pause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "unpause", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "isPaused", inputs: [], outputs: [{ type: "bool" }], stateMutability: "view" },
  {
    type: "function",
    name: "proposeAdmin",
    inputs: [{ name: "newAdmin", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  { type: "function", name: "acceptAdmin", inputs: [], outputs: [], stateMutability: "nonpayable" },
  { type: "function", name: "pendingAdmin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "setCreditManager",
    inputs: [{ name: "newAddress", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "setUserRegistry",
    inputs: [{ name: "newAddress", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "createChat",
    inputs: [
      { name: "name", type: "string" },
      { name: "cid", type: "string" },
      { name: "hash", type: "bytes32" },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "updateChat",
    inputs: [
      { name: "chatId", type: "bytes32" },
      { name: "newCid", type: "string" },
      { name: "newHash", type: "bytes32" },
      { name: "newName", type: "string" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "archiveChat",
    inputs: [{ name: "chatId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "restoreChat",
    inputs: [{ name: "chatId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getChat",
    inputs: [{ name: "chatId", type: "bytes32" }],
    outputs: [
      { type: "address" },
      { type: "uint32" },
      { type: "string" },
      { type: "bytes32" },
      { type: "string" },
      { type: "uint8" },
      { type: "uint64" },
      { type: "uint64" },
    ],
    stateMutability: "view",
  },
  { type: "function", name: "totalChats", inputs: [], outputs: [{ type: "uint256" }], stateMutability: "view" },
  { type: "function", name: "admin", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  {
    type: "function",
    name: "getChatCountByOwner",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getNonce",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getChatByOwnerIndex",
    inputs: [
      { name: "owner", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "bytes32" }],
    stateMutability: "view",
  },
  { type: "function", name: "creditManager", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
  { type: "function", name: "userRegistry", inputs: [], outputs: [{ type: "address" }], stateMutability: "view" },
];

// ── ABI Map ────────────────────────────────────────────────────────────────

const CONTRACT_ABIS: Record<string, AbiItem[]> = {
  "credit-manager": CREDIT_MANAGER_ABI,
  "user-registry": USER_REGISTRY_ABI,
  "memory-registry": MEMORY_REGISTRY_ABI,
  "agent-registry": AGENT_REGISTRY_ABI,
  "context-registry": CONTEXT_REGISTRY_ABI,
  "audit-registry": AUDIT_REGISTRY_ABI,
  "chat-registry": CHAT_REGISTRY_ABI,
};

/**
 * Write ABI JSON files to the deployment directory.
 * These are consumed by updateDeployedAddresses() to populate deployedContracts.ts.
 */
export function generateAbis(deploymentDir: string): void {
  for (const [contractName, abi] of Object.entries(CONTRACT_ABIS)) {
    const abiPath = path.resolve(deploymentDir, contractName);
    fs.writeFileSync(abiPath, JSON.stringify(abi, null, 2));
    console.log(`📄 ABI written: ${abiPath}`);
  }
}

/**
 * Get ABI for a specific contract.
 */
export function getContractAbi(contractName: string): AbiItem[] | undefined {
  return CONTRACT_ABIS[contractName];
}

if (require.main === module) {
  const deploymentDir = process.argv[2] || path.resolve(__dirname, "../deployments");
  generateAbis(deploymentDir);
}

