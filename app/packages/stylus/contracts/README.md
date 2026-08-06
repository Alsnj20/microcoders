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

## Project Structure

```
contracts/
├── Cargo.toml                    # Workspace configuration
├── memorychain-common/           # Shared types, events, interfaces, errors
│   └── src/
│       ├── lib.rs
│       ├── types.rs              # Enums (MemoryType, AgentType, etc.)
│       ├── events.rs             # Solidity events (including pricing events)
│       ├── interfaces.rs         # ICreditManager, IMemoryRegistry, IAgentRegistry
│       ├── errors.rs             # Typed error enums
│       └── helpers.rs            # generate_id utility
│
├── credit-manager/               # Credit management + ETH payments (10 tests)
├── user-registry/                # User management (5 tests)
├── memory-registry/              # Memory lifecycle + preview cost
├── agent-registry/               # Agent lifecycle + preview cost
├── context-registry/             # Agent ↔ Memory relationships
├── audit-registry/               # Verifiable history
│
├── deploy/
│   ├── sepolia.json              # Arbitrum Sepolia config + treasury
│   └── one.json                  # Arbitrum One config + treasury
│
└── scripts/
    └── deploy.sh                 # Automated deployment (dual wallet)
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

## Cross-Contract Calls

| Contract | Calls | Purpose |
|----------|-------|---------|
| MemoryRegistry | CreditManager | `consumeCredits()` before registering |
| AgentRegistry | CreditManager | `consumeCredits()` before registering |
| ContextRegistry | MemoryRegistry | `getMemory()` to verify exists |
| ContextRegistry | AgentRegistry | `getAgent()` to verify exists |

## Contract Modules

### UserRegistry

Manages user identities within the protocol.

| Function | Description |
|----------|-------------|
| `register_user(username)` | Register a new user |
| `update_username(new_username)` | Update caller's username |
| `deactivate_user()` | Deactivate caller's account |
| `exists(owner)` | Check if address is registered |
| `is_registered(owner)` | Check if caller is registered |
| `get_username(owner)` | Get user's username |
| `is_active(owner)` | Check if account is active |
| `total_users()` | Get total registered users |

### CreditManager

Manages Memory Credits (MC) — the internal consumption unit that funds AI processing. Supports ETH payments on both testnet and mainnet.

#### Core Functions

| Function | Description |
|----------|-------------|
| `buy_credits(amount)` | Buy credits with ETH (ETH is forwarded to treasury) |
| `consume_credits(user, amount)` | Consume credits (authorized contracts only) |
| `refund_credits(user, amount)` | Refund credits to user (admin only) |
| `balance_of(user)` | Get credit balance |
| `has_sufficient_credits(user, amount)` | Check if user has enough credits |

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
| `set_treasury(treasury)` | Update treasury address |
| `set_purchase_limits(min, max)` | Update min/max MC per purchase |
| `set_testnet_mode(is_testnet)` | Toggle testnet mode flag |
| `get_pricing()` | Get full pricing config |
| `is_testnet()` | Check if testnet mode |
| `get_treasury()` | Get treasury address |
| `get_price_per_credit()` | Get price per credit in wei |

#### Authorization (Admin)

| Function | Description |
|----------|-------------|
| `authorize_consumer(consumer)` | Authorize contract to consume credits |
| `revoke_consumer(consumer)` | Revoke consumer authorization |
| `initialize_network(is_testnet, treasury, price)` | Initialize network config |

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

#### Pricing Defaults

| Parameter | Value |
|-----------|-------|
| Price per credit | 0.000001 ETH (10^12 wei) |
| Min purchase | 1 MC |
| Max purchase | 1000 MC |

### MemoryRegistry

Manages the lifecycle of user memories (knowledge units).

**Cross-contract:** Consumes credits via CreditManager before registering. Fees are dynamic (read from CreditManager).

| Function | Description |
|----------|-------------|
| `create_memory(cid, hash, type, vis)` | Create new memory |
| `update_memory(id, new_cid, new_hash)` | Update existing memory |
| `archive_memory(id)` | Archive memory (soft delete) |
| `restore_memory(id)` | Restore archived memory |
| `get_memory(id)` | Get memory data |
| `get_memory_version(id, version)` | Get specific version |
| `preview_create_cost()` | Get cost to create memory (MC) |
| `get_memory_count_by_owner(owner)` | Get number of memories by owner |
| `get_memory_by_owner_index(owner, index)` | Get memory ID by owner and index |

### AgentRegistry

Manages personal AI agents created by users.

**Cross-contract:** Consumes credits via CreditManager before registering. Fees are dynamic (read from CreditManager).

| Function | Description |
|----------|-------------|
| `create_agent(name, desc, cid, hash)` | Create new agent |
| `update_agent(id, new_cid, new_hash)` | Update agent blueprint |
| `archive_agent(id)` | Archive agent (soft delete) |
| `restore_agent(id)` | Restore archived agent |
| `get_agent(id)` | Get agent data |
| `get_agent_version(id, version)` | Get specific version |
| `preview_create_cost()` | Get cost to create agent (MC) |
| `get_agent_count_by_owner(owner)` | Get number of agents by owner |
| `get_agent_by_owner_index(owner, index)` | Get agent ID by owner and index |

### ContextRegistry

Manages many-to-many relationships between agents and memories.

**Cross-contract:** Verifies memory and agent exist before linking. Also verifies caller owns both resources.

| Function | Description |
|----------|-------------|
| `link_memory(agent_id, memory_id, priority)` | Link memory to agent |
| `unlink_memory(agent_id, memory_id)` | Unlink memory from agent |
| `change_priority(context_id, new_priority)` | Change link priority |
| `disable_link(context_id)` | Disable link without deleting |
| `enable_link(context_id)` | Re-enable disabled link |
| `get_agent_context_count(agent_id)` | Get number of linked memories for agent |
| `get_agent_context_by_index(agent_id, index)` | Get context ID by agent and index |

### AuditRegistry

Maintains verifiable history of the protocol.

| Function | Description |
|----------|-------------|
| `record_audit(actor, entity_type, entity_id, action)` | Record audit event |
| `get_audit_event(event_id)` | Get event data |
| `authorize_recorder(recorder)` | Authorize contract to record |

## Events

### Core Events

| Contract | Events |
|----------|--------|
| UserRegistry | `UserRegistered`, `UsernameUpdated`, `UserDeactivated` |
| CreditManager | `CreditsPurchased`, `CreditsConsumed`, `CreditsRefunded` |
| MemoryRegistry | `MemoryCreated`, `MemoryUpdated`, `MemoryArchived`, `MemoryRestored` |
| AgentRegistry | `AgentCreated`, `AgentUpdated`, `AgentArchived`, `AgentRestored` |
| ContextRegistry | `ContextLinked`, `ContextUnlinked`, `PriorityChanged`, `LinkDisabled`, `LinkEnabled` |
| AuditRegistry | `AuditRecorded` |

### Pricing Events (CreditManager)

| Event | Description |
|-------|-------------|
| `FeeUpdated(operation, old_fee, new_fee)` | Operation fee changed |
| `PricePerCreditUpdated(old_price, new_price)` | ETH price per credit changed |
| `TreasuryUpdated(old_treasury, new_treasury)` | Treasury address changed |
| `TestnetModeUpdated(is_testnet)` | Testnet mode toggled |
| `PurchaseLimitsUpdated(min, max)` | Purchase limits changed |

## Error Handling

All contracts use typed error enums for gas efficiency and type safety:

```rust
// Common errors
enum CommonError { NotAdmin, NotOwner, NotRegistered, ResourceNotFound, ... }

// Credit errors
enum CreditError {
    InsufficientBalance,
    ZeroAmount,
    UnauthorizedConsumer,
    InsufficientPayment { required, provided },  // ETH payment too low
    PurchaseOutOfRange { min, max, requested },   // Outside limits
    TestnetModeActive,
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

enum AgentType {
    General = 0,
    Coder = 1,
    Writer = 2,
    Analyst = 3,
    Researcher = 4,
    Custom = 5,
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
2. Frontend calculates ETH required (amount × 0.000001 ETH)
3. User signs transaction with msg.value = ETH required
4. Contract:
   a. Validates amount within limits (1-1000 MC)
   b. Verifies msg.value >= required ETH
   c. Grants credits to user balance
   d. Emits CreditsPurchased event
```

### Create Memory/Agent Flow (Christian's Flow)

```
1. Backend detects intent → proposes creating memory/agent
2. Frontend shows form (name, description editable)
3. User modifies if desired → signs transaction
4. Contract:
   a. Verifies sufficient credits (has_sufficient_credits)
   b. Creates memory/agent + consumes credits (atomic)
   c. Returns success
```

## Testing

### Run all tests

```bash
cargo test -F stylus-test
```

### Run tests by package

```bash
cargo test -p credit-manager -F stylus-test
cargo test -p user-registry -F stylus-test
```

### Run a specific test

```bash
cargo test -p credit-manager test_buy_credits -F stylus-test
```

## Build & Deploy

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

### Check contracts compile to valid Stylus WASM

```bash
cargo check --workspace
cd credit-manager && cargo stylus check
cd user-registry && cargo stylus check
cd memory-registry && cargo stylus check
cd agent-registry && cargo stylus check
cd context-registry && cargo stylus check
cd audit-registry && cargo stylus check
```

> _Script `deploy.sh` will automatically run these checks before deploying._

### Deploy to Arbitrum Sepolia (testnet)

```bash
./scripts/deploy.sh sepolia
```

Apply the paramet  `--force` to redeploy even if addresses already exist in `deploy/sepolia.json`.
    
### Deploy to Arbitrum One (mainnet)

```bash
./scripts/deploy.sh one
```

### What the deploy script does

1. Selects wallet based on network (TESTNET_* or MAINNET_*)
2. Verifies workspace compiles (`cargo check`)
3. Runs `cargo stylus check` for each contract
4. Deploys contracts in correct order
5. Initializes CreditManager with network config:
   - `is_testnet`: true/false
   - `treasury`: address to receive ETH
   - `price_per_credit`: 0.000001 ETH (10^12 wei)
6. Saves addresses to `deploy/<network>.json`

### Post-deployment setup (if needed)

```bash
# Authorize MemoryRegistry as credit consumer
cast send <CREDIT_MANAGER> "authorizeConsumer(address)" <MEMORY_REGISTRY> --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Authorize AgentRegistry as credit consumer
cast send <CREDIT_MANAGER> "authorizeConsumer(address)" <AGENT_REGISTRY> --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Initialize ContextRegistry with MemoryRegistry and AgentRegistry addresses
cast send <CONTEXT_REGISTRY> "initialize(address,address)" <MEMORY_REGISTRY> <AGENT_REGISTRY> --rpc-url $RPC_URL --private-key $PRIVATE_KEY
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

1. **"credit consumption failed"** - User doesn't have enough MC credits. They need to buy credits first via `buy_credits()`.

2. **"not memory owner" / "not agent owner"** - In ContextRegistry, the caller must own both the memory AND the agent to link them.

3. **"ETH transfer to treasury failed"** - The treasury address might be invalid or the contract might not have enough ETH balance.

4. **"failed to get fee"** - CreditManager might not be initialized or the operation code is invalid.

### Fee Configuration

Fees are now dynamic. To change operation costs:
```bash
# As admin, call set_fee on CreditManager
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
