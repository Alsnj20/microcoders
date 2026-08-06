# MemoryChain Smart Contracts

> Decentralized protocol for AI knowledge ownership on Arbitrum Stylus.

## Overview

MemoryChain is a protocol built on **Arbitrum Stylus** that allows users to own their personal knowledge and reuse it across multiple AI agents securely, verifiably, and interoperably.

The blockchain only stores verifiable references (owners, hashes, CIDs, versions). All private data remains encrypted off-chain in IPFS.

## Architecture

```
                     Wallet
                        │
                 UserRegistry
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
  MemoryRegistry               AgentRegistry
         │                             │
         └──────────────┬──────────────┘
                        ▼
                ContextRegistry
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
  CreditManager                 AuditRegistry
         │
         ▼
   ETH Treasury
```

### Cross-Contract Interactions

```
MemoryRegistry ──getFee──> CreditManager
MemoryRegistry ──consumeCredits──> CreditManager
MemoryRegistry ──incrementMemories──> UserRegistry

AgentRegistry ──getFee──> CreditManager
AgentRegistry ──consumeCredits──> CreditManager
AgentRegistry ──incrementAgents──> UserRegistry

ContextRegistry ──getMemory──> MemoryRegistry (verify exists)
ContextRegistry ──getAgent──> AgentRegistry (verify exists)
ContextRegistry ──getFee──> CreditManager
ContextRegistry ──consumeCredits──> CreditManager
```

## Project Structure

```
contracts/
├── Cargo.toml                    # Workspace configuration
├── memorychain-common/           # Shared types, events, interfaces, errors
│   └── src/
│       ├── lib.rs
│       ├── types.rs              # Enums (MemoryType, AgentType, etc.)
│       ├── events.rs             # Solidity events
│       ├── interfaces.rs         # ICreditManager, IMemoryRegistry, IAgentRegistry, IUserRegistry
│       ├── errors.rs             # Typed error enums
│       └── helpers.rs            # generate_id utility
│
├── credit-manager/               # Credit management + ETH payments
├── user-registry/                # User management + username uniqueness
├── memory-registry/              # Memory lifecycle + user stats update
├── agent-registry/               # Agent lifecycle + user stats update
├── context-registry/             # Agent ↔ Memory relationships + credit charging
├── audit-registry/               # Verifiable history
│
├── deploy/
│   ├── sepolia.json              # Arbitrum Sepolia config + addresses
│   └── one.json                  # Arbitrum One config
│
└── scripts/
    └── deploy.sh                 # Automated deployment (dual wallet)
```

## Security Features

### Pausable (All Contracts)

Every contract implements a `Pausable` pattern for emergency stops:

```rust
// Admin can pause/unpause any contract
contract.pause().unwrap();   // All mutating functions revert
contract.unpause().unwrap(); // Operations resume
```

When paused, all state-mutating functions return `CommonError: contract is paused`.

### Two-Step Admin Transfer (All Contracts)

Admin transfer requires proposer + acceptor, preventing accidental or malicious transfers:

```rust
// Step 1: Current admin proposes new admin
contract.propose_admin(new_admin_address)?;

// Step 2: Proposed admin accepts
// (called by new_admin_address in a separate transaction)
contract.accept_admin()?;
```

### Access Control

| Pattern | Contracts | Description |
|---------|-----------|-------------|
| Admin-only | All | Fee changes, pause, authorize/revoke |
| Authorized consumers | CreditManager | Only whitelisted contracts can consume credits |
| Authorized updaters | UserRegistry | Only whitelisted contracts can update user stats |
| Resource ownership | MemoryRegistry, AgentRegistry | Only owner can update/archive/restore |
| Context ownership | ContextRegistry | Only owner of agent or memory can modify links |

## Contract Modules

### UserRegistry

Manages user identities with username uniqueness enforcement.

| Function | Access | Description |
|----------|--------|-------------|
| `register_user(username)` | Public | Register new user (username must be unique, 1-64 chars) |
| `update_username(new_username)` | Owner | Update caller's username |
| `deactivate_user()` | Owner | Deactivate caller's account |
| `increment_agents(owner)` | Authorized | Increment agent count (cross-contract) |
| `increment_memories(owner)` | Authorized | Increment memory count (cross-contract) |
| `authorize_updater(updater)` | Admin | Grant updater authorization |
| `revoke_updater(updater)` | Admin | Revoke updater authorization |
| `propose_admin(new_admin)` | Admin | Propose new admin (two-step) |
| `accept_admin()` | Pending | Accept admin role |
| `pause()` / `unpause()` | Admin | Emergency stop |
| `exists(owner)` | View | Check if address is registered |
| `is_registered(owner)` | View | Check if address is registered |
| `get_username(owner)` | View | Get user's username |
| `is_active(owner)` | View | Check if account is active |
| `get_agent_count(owner)` | View | Get agent count |
| `get_memory_count(owner)` | View | Get memory count |
| `total_users()` | View | Get total registered users |

### CreditManager

Manages Memory Credits (MC) — the internal consumption unit that funds AI processing.

**Security:**
- `consume_credits()` **reverts** on insufficient balance (safe pattern)
- `buy_credits()` uses `checked_mul` to prevent overflow
- Treasury address validated against `Address::ZERO`

#### Core Functions

| Function | Access | Description |
|----------|--------|-------------|
| `buy_credits(amount)` | Public (payable) | Buy credits with ETH (forwarded to treasury) |
| `consume_credits(user, amount)` | Authorized | Consume credits (reverts on insufficient) |
| `refund_credits(user, amount)` | Admin | Refund credits to user |
| `balance_of(user)` | View | Get credit balance |
| `has_sufficient_credits(user, amount)` | View | Check if user has enough credits |

#### Fee Management (Admin)

| Function | Description |
|----------|-------------|
| `set_fee(operation, fee)` | Update fee for specific operation |
| `get_fee(operation)` | Get fee for specific operation |
| `get_fees()` | Get all configured fees |

#### Pricing Management (Admin)

| Function | Description |
|----------|-------------|
| `set_price_per_credit(price_wei)` | Update ETH price per MC |
| `set_treasury(treasury)` | Update treasury address (validates != ZERO) |
| `set_purchase_limits(min, max)` | Update min/max MC per purchase |
| `set_testnet_mode(is_testnet)` | Toggle testnet mode flag |
| `initialize_network(is_testnet, treasury, price)` | Initialize network config |

#### Authorization (Admin)

| Function | Description |
|----------|-------------|
| `authorize_consumer(consumer)` | Authorize contract to consume credits |
| `revoke_consumer(consumer)` | Revoke consumer authorization |

#### Operation Constants

```rust
pub const OP_REGISTER_USER: u8 = 0;
pub const OP_CREATE_MEMORY: u8 = 1;
pub const OP_UPDATE_MEMORY: u8 = 2;
pub const OP_CREATE_AGENT: u8 = 3;
pub const OP_UPDATE_AGENT: u8 = 4;
pub const OP_EXECUTE_AGENT: u8 = 5;
pub const OP_LINK_MEMORY: u8 = 6;
```

#### Default Fees

| Operation | Cost |
|-----------|------|
| Register user | 0 MC (free) |
| Create memory | 1 MC |
| Update memory | 1 MC |
| Create agent | 5 MC |
| Update agent | 2 MC |
| Execute agent | 2 MC |
| Link memory | 1 MC |

### MemoryRegistry

Manages the lifecycle of user memories (knowledge units).

**Cross-contract:**
- Consumes credits via `CreditManager` before create/update
- Updates user stats via `UserRegistry` after create

**Validation:**
- `memory_type` must be 0-4 (Preference/Knowledge/Document/Objective/Other)
- `visibility` must be 0-2 (Private/Shared/Public)

| Function | Access | Description |
|----------|--------|-------------|
| `create_memory(cid, hash, type, vis)` | Public | Create new memory (charges credits) |
| `update_memory(id, new_cid, new_hash)` | Owner | Update existing memory (charges credits) |
| `archive_memory(id)` | Owner | Archive memory (soft delete) |
| `restore_memory(id)` | Owner | Restore archived memory |
| `propose_admin(new_admin)` | Admin | Propose new admin |
| `accept_admin()` | Pending | Accept admin role |
| `pause()` / `unpause()` | Admin | Emergency stop |
| `get_memory(id)` | View | Get memory data |
| `get_memory_version(id, version)` | View | Get specific version |
| `preview_create_cost()` | View | Get cost to create memory (MC) |
| `get_memory_count_by_owner(owner)` | View | Get number of memories by owner |
| `get_memory_by_owner_index(owner, index)` | View | Get memory ID by owner and index |

### AgentRegistry

Manages personal AI agents created by users.

**Cross-contract:**
- Consumes credits via `CreditManager` before create/update
- Updates user stats via `UserRegistry` after create

| Function | Access | Description |
|----------|--------|-------------|
| `create_agent(name, desc, cid, hash)` | Public | Create new agent (charges credits) |
| `update_agent(id, new_cid, new_hash)` | Owner | Update agent blueprint (charges credits) |
| `archive_agent(id)` | Owner | Archive agent (soft delete) |
| `restore_agent(id)` | Owner | Restore archived agent |
| `propose_admin(new_admin)` | Admin | Propose new admin |
| `accept_admin()` | Pending | Accept admin role |
| `pause()` / `unpause()` | Admin | Emergency stop |
| `get_agent(id)` | View | Get agent data |
| `get_agent_version(id, version)` | View | Get specific version |
| `preview_create_cost()` | View | Get cost to create agent (MC) |
| `get_agent_count_by_owner(owner)` | View | Get number of agents by owner |
| `get_agent_by_owner_index(owner, index)` | View | Get agent ID by owner and index |

### ContextRegistry

Manages many-to-many relationships between agents and memories.

**Cross-contract:**
- Verifies memory and agent exist before linking
- Verifies caller owns both resources (link, unlink, change_priority, disable, enable)
- Charges credits via `CreditManager` for linking

| Function | Access | Description |
|----------|--------|-------------|
| `link_memory(agent_id, memory_id, priority)` | Owner | Link memory to agent (charges credits) |
| `unlink_memory(agent_id, memory_id)` | Owner | Unlink memory from agent |
| `change_priority(context_id, new_priority)` | Owner | Change link priority |
| `disable_link(context_id)` | Owner | Disable link without deleting |
| `enable_link(context_id)` | Owner | Re-enable disabled link |
| `propose_admin(new_admin)` | Admin | Propose new admin |
| `accept_admin()` | Pending | Accept admin role |
| `pause()` / `unpause()` | Admin | Emergency stop |
| `get_link(agent_id, memory_id)` | View | Get context_id for a link |
| `get_context(context_id)` | View | Get full link data |
| `get_agent_context_count(agent_id)` | View | Get number of linked memories for agent |
| `get_agent_context_by_index(agent_id, index)` | View | Get context ID by agent and index |

### AuditRegistry

Maintains verifiable history of the protocol.

| Function | Access | Description |
|----------|--------|-------------|
| `record_audit(actor, entity_type, entity_id, action)` | Authorized | Record audit event |
| `authorize_recorder(recorder)` | Admin | Authorize contract to record |
| `revoke_recorder(recorder)` | Admin | Revoke recorder authorization |
| `propose_admin(new_admin)` | Admin | Propose new admin |
| `accept_admin()` | Pending | Accept admin role |
| `pause()` / `unpause()` | Admin | Emergency stop |
| `get_audit_event(event_id)` | View | Get event data |
| `total_events()` | View | Get total recorded events |

## Events

### All Events by Contract

| Contract | Events |
|----------|--------|
| **UserRegistry** | `UserRegistered`, `UsernameUpdated`, `UserDeactivated`, `UpdaterAuthorized`, `UpdaterRevoked`, `ContractPaused`, `ContractUnpaused`, `AdminTransferProposed`, `AdminTransferCompleted` |
| **CreditManager** | `CreditsPurchased`, `CreditsConsumed`, `CreditsRefunded`, `FeeUpdated`, `PricePerCreditUpdated`, `TreasuryUpdated`, `TestnetModeUpdated`, `PurchaseLimitsUpdated`, `ConsumerAuthorized`, `ConsumerRevoked`, `ContractPaused`, `ContractUnpaused`, `AdminTransferProposed`, `AdminTransferCompleted` |
| **MemoryRegistry** | `MemoryCreated`, `MemoryUpdated`, `MemoryArchived`, `MemoryRestored`, `ContractPaused`, `ContractUnpaused`, `AdminTransferProposed`, `AdminTransferCompleted` |
| **AgentRegistry** | `AgentCreated`, `AgentUpdated`, `AgentArchived`, `AgentRestored`, `ContractPaused`, `ContractUnpaused`, `AdminTransferProposed`, `AdminTransferCompleted` |
| **ContextRegistry** | `ContextLinked`, `ContextUnlinked`, `PriorityChanged`, `LinkDisabled`, `LinkEnabled`, `ContractPaused`, `ContractUnpaused`, `AdminTransferProposed`, `AdminTransferCompleted` |
| **AuditRegistry** | `AuditRecorded`, `RecorderAuthorized`, `RecorderRevoked`, `ContractPaused`, `ContractUnpaused`, `AdminTransferProposed`, `AdminTransferCompleted` |

## Error Handling

All contracts use typed error enums for gas efficiency and type safety:

```rust
// Common errors (all contracts)
enum CommonError {
    NotAdmin { caller },
    NotOwner { caller, owner },
    NotRegistered { caller },
    ResourceNotFound,
    ResourceArchived,
    AlreadyExists,
    InvalidInput { reason },
    Paused,           // Contract is paused
    NotPaused,        // Contract is not paused
}

// Credit errors
enum CreditError {
    InsufficientBalance { required, available },  // Reverts on insufficient
    ZeroAmount,
    UnauthorizedConsumer { caller },
    InsufficientPayment { required, provided },
    PurchaseOutOfRange { min, max, requested },
}

// User errors
enum UserError {
    UsernameTaken { username },
}

// Memory errors
enum MemoryError { NotFound, NotOwner, Archived, InvalidCid, InvalidHash, ... }

// Agent errors
enum AgentError { NotFound, NotOwner, Archived, InvalidName, ... }

// Context errors
enum ContextError { LinkNotFound, AlreadyLinked, LinkNotActive, ... }
```

## Enums

```rust
enum MemoryType {
    Preference = 0,
    Knowledge = 1,
    Document = 2,
    Objective = 3,
    Other = 4,
}

enum Visibility {
    Private = 0,
    Shared = 1,
    Public = 2,
}

enum ResourceStatus {
    Active = 0,
    Archived = 1,
}
```

## Critical Flows

### Credit Purchase Flow

```
User → Frontend → buy_credits(amount) → signs TX with ETH value → CreditManager

1. User selects credit package (50, 100, 200 MC)
2. Frontend calculates ETH required (amount × price_per_credit)
3. User signs transaction with msg.value = ETH required
4. Contract:
   a. Validates amount within limits (min-max MC)
   b. Calculates required ETH with checked_mul (no overflow)
   c. Verifies msg.value >= required ETH
   d. Grants credits to user balance
   e. Forwards ETH to treasury
   f. Emits CreditsPurchased event
```

### Create Memory Flow

```
1. Backend detects intent → proposes creating memory
2. Frontend shows form (name, description editable)
3. User modifies if desired → signs transaction
4. Contract:
   a. Validates CID, hash, memory_type (0-4), visibility (0-2)
   b. Generates unique ID via keccak256(owner, timestamp, nonce)
   c. Gets fee from CreditManager (OP_CREATE_MEMORY)
   d. Consumes credits via CreditManager (reverts if insufficient)
   e. Stores memory + version 1
   f. Updates user stats via UserRegistry
   g. Emits MemoryCreated event
```

### Link Memory Flow

```
1. User wants to connect a memory to an agent
2. Frontend calls link_memory(agent_id, memory_id, priority)
3. Contract:
   a. Verifies memory exists (cross-contract to MemoryRegistry)
   b. Verifies agent exists (cross-contract to AgentRegistry)
   c. Verifies caller owns BOTH memory and agent
   d. Gets fee from CreditManager (OP_LINK_MEMORY)
   e. Consumes credits via CreditManager
   f. Creates context linking agent ↔ memory
   g. Emits ContextLinked event
```

## Dual Network Support

MemoryChain supports both **testnet** (Arbitrum Sepolia) and **mainnet** (Arbitrum One) with separate wallet configurations.

### Wallet Configuration

```bash
# .env file
TESTNET_PRIVATE_KEY=0x...    # Private key for testnet deployments
TESTNET_TREASURY=0x...       # Treasury address for testnet ETH
MAINNET_PRIVATE_KEY=0x...    # Private key for mainnet deployments
MAINNET_TREASURY=0x...       # Treasury address for mainnet ETH
```

### Network Comparison

| Feature | Testnet (Sepolia) | Mainnet (Arbitrum One) |
|---------|-------------------|------------------------|
| ETH Type | Sepolia ETH (free from faucets) | Real ETH |
| Price per MC | 0.000001 ETH | 0.000001 ETH |
| Wallet | `TESTNET_*` | `MAINNET_*` |
| Explorer | sepolia.arbiscan.io | arbiscan.io |

## Deployment

### Prerequisites

1. Install Rust toolchain:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

2. Install Stylus CLI:
```bash
cargo install cargo-stylus
```

3. (Optional) Install Foundry for balance checks:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

4. Configure `.env` with your wallets:
```bash
TESTNET_PRIVATE_KEY=0x...
TESTNET_TREASURY=0x...
MAINNET_PRIVATE_KEY=0x...
MAINNET_TREASURY=0x...
```

### Deploy to Arbitrum Sepolia (testnet)

```bash
./scripts/deploy.sh sepolia
```

Use `--force` to redeploy even if addresses already exist:
```bash
./scripts/deploy.sh sepolia --force
```

### Deploy to Arbitrum One (mainnet)

```bash
./scripts/deploy.sh one
```

### What the Deploy Script Does

1. Selects wallet based on network (`TESTNET_*` or `MAINNET_*`)
2. Verifies workspace compiles (`cargo check`)
3. Runs `cargo stylus check` for each contract
4. Deploys contracts in correct dependency order:
   - CreditManager (no dependencies)
   - UserRegistry (no dependencies)
   - MemoryRegistry (needs CreditManager + UserRegistry)
   - AgentRegistry (needs CreditManager + UserRegistry)
   - ContextRegistry (needs MemoryRegistry + AgentRegistry + CreditManager)
   - AuditRegistry (no dependencies)
5. Initializes all contracts with correct addresses:
   - `MemoryRegistry.initialize(credit_manager, user_registry)`
   - `AgentRegistry.initialize(credit_manager, user_registry)`
   - `ContextRegistry.initialize(memory_registry, agent_registry, credit_manager)`
   - `AuditRegistry.initialize()`
6. Authorizes credit consumers: MemoryRegistry, AgentRegistry, ContextRegistry
7. Authorizes stat updaters: MemoryRegistry, AgentRegistry (on UserRegistry)
8. Configures CreditManager network (treasury, price, testnet mode)
9. Saves addresses to `deploy/<network>.json`

### Post-Deployment Verification

```bash
# Check admin is set correctly
cast call <CONTRACT> "admin()" --rpc-url $RPC_URL

# Check contract is not paused
cast call <CONTRACT> "isPaused()" --rpc-url $RPC_URL

# Check credit consumers are authorized
cast call <CREDIT_MANAGER> "authorizedConsumers(address)" <MEMORY_REGISTRY> --rpc-url $RPC_URL
```

## Testing

### Run all tests

```bash
cargo test --features stylus-test
```

### Run tests by package

```bash
cargo test -p credit-manager --features stylus-test
cargo test -p user-registry --features stylus-test
```

### Run a specific test

```bash
cargo test -p credit-manager test_buy_credits --features stylus-test
```

## Frontend Integration

### Credit Packages

```javascript
const CREDIT_PACKAGES = [
  { mc: 50,  eth: "0.00005" },
  { mc: 100, eth: "0.0001" },
  { mc: 200, eth: "0.0002" },
];
```

### Switch Network

```javascript
// Detect current network
const chainId = await ethereum.request({ method: 'eth_chainId' });
const isTestnet = chainId === '0x66ece'; // 421614

// Load correct contract addresses
const contracts = isTestnet ? sepoliaContracts : mainnetContracts;
```

### Preview Costs

```javascript
// Get cost to create memory/agent
const memoryCost = await memoryRegistry.preview_create_cost();
const agentCost = await agentRegistry.preview_create_cost();
```

## Dependencies

```toml
[workspace.dependencies]
alloy-primitives = "1.5.7"
alloy-sol-types = "1.5.7"
stylus-sdk = "0.10.8"
stylus-core = "0.10.8"
sha2 = "0.10"
tiny-keccak = "2.0"
```

## Troubleshooting

### Common Issues

1. **"credit consumption failed"** — User doesn't have enough MC credits. They need to buy credits first via `buy_credits()`.

2. **"not memory owner" / "not agent owner"** — In ContextRegistry, the caller must own both the memory AND the agent to link/unlink/modify.

3. **"ETH transfer to treasury failed"** — The treasury address might be invalid or the contract might not have enough ETH balance.

4. **"failed to get fee"** — CreditManager might not be initialized or the operation code is invalid.

5. **"contract is paused"** — The contract has been paused by admin. Wait for unpause or contact admin.

6. **"not pending admin"** — The `accept_admin()` caller doesn't match the proposed admin address.

7. **"unauthorized consumer"** — The calling contract is not authorized to consume credits. Admin must call `authorizeConsumer()`.

8. **"username already taken"** — The username is registered by another user. Choose a different username.

9. **"invalid memory type" / "invalid visibility"** — memory_type must be 0-4, visibility must be 0-2.

### Fee Configuration

Fees are dynamic. To change operation costs:
```bash
# As admin, call setFee on CreditManager
cast send <CREDIT_MANAGER> "setFee(uint8,uint16)" <operation_code> <new_fee> --rpc-url $RPC_URL --private-key $PRIVATE_KEY
```

Operation codes:
- 0: Register user (free)
- 1: Create memory
- 2: Update memory
- 3: Create agent
- 4: Update agent
- 5: Execute agent
- 6: Link memory

## License

MIT
