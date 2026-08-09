# Handoff: Chat Registry Implementation + On-Chain Names + Provider Migration

## Session Metadata
- Created: 2026-08-08 20:08:14
- Project: /home/cricro/store/projects/eth-lima/microcoders/app
- Branch: fix/flows
- Session duration: ~60 minutes

### Recent Commits (for context)
- 8d6a54b fix: wasm compilation script for stale builds
- f0da70e fix: devnode launch
- e340e6c chore: polish deps, env examples
- b2c95e7 fix: session disconnect and onboarding onchain check
- 6357ade feat: update contracts

## Handoff Chain

- **Continues from**: [2026-08-08-195254-stylus-wasm-rebuild-and-deploy.md](./2026-08-08-195254-stylus-wasm-rebuild-and-deploy.md)
  - Previous title: Stylus WASM Rebuild & Contract Initialization Fix
- **Supersedes**: None

## Current State Summary

Implemented the full ChatRegistry system for on-chain chat tracking. Users can now create, update, archive, and list chat conversations on-chain with `bytes32` IDs. Chat names are stored on-chain (unlike before where they were only in localStorage). Also migrated memory and agent names to be stored on-chain for new entities. Replaced Mistral AI provider with Microsoft Foundry. All 7 contracts are deployed and initialized on Nitro dev node. Backend and frontend updated to use the new on-chain chat persistence.

## Codebase Understanding

### Architecture Overview

- **Monorepo**: pnpm workspace with `packages/nextjs` (frontend), `packages/hono` (backend), `packages/stylus` (smart contracts)
- **Smart Contracts**: 7 Rust/Stylus contracts deployed on local Nitro dev node (chain ID 412346)
- **Deployment tooling**: `cargo stylus deploy` via TypeScript scripts in `packages/stylus/scripts/`
- **Nitro DevNode**: Docker-based, uses `offchainlabs/nitro-node:v3.11.0-a618155` with Stylus dev dependencies
- **Backend**: Hono framework with viem for blockchain interaction
- **Frontend**: Next.js 16 (App Router) with React 19, wagmi, viem

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `packages/stylus/contracts/chat-registry/src/lib.rs` | New ChatRegistry contract | Core of this implementation |
| `packages/stylus/contracts/memorychain-common/src/types.rs` | Operation codes (OP_CREATE_CHAT, OP_UPDATE_CHAT) | Used by CreditManager |
| `packages/stylus/contracts/memorychain-common/src/errors.rs` | ChatError enum | Error handling for chat operations |
| `packages/stylus/contracts/memorychain-common/src/events.rs` | Chat events (ChatCreated, ChatUpdated, etc.) | On-chain event emission |
| `packages/stylus/contracts/memorychain-common/src/interfaces.rs` | IChatRegistry, updated IUserRegistry | Cross-contract call interfaces |
| `packages/stylus/contracts/credit-manager/src/lib.rs` | Updated with chat fee fields | Credit consumption for chat ops |
| `packages/stylus/contracts/user-registry/src/lib.rs` | Updated with total_chats, increment_chats | User chat count tracking |
| `packages/stylus/contracts/memory-registry/src/lib.rs` | Updated with on-chain name field | New entities store names on-chain |
| `packages/stylus/contracts/agent-registry/src/lib.rs` | Updated with on-chain name field | New entities store names on-chain |
| `packages/stylus/scripts/deploy.ts` | Updated to deploy chat-registry | Deployment orchestration |
| `packages/stylus/scripts/init_contracts.ts` | Updated to initialize chat-registry | Contract initialization + auth |
| `packages/hono/src/lib/contracts.ts` | ChatRegistry adapter, updated memory/agent adapters | Backend blockchain interaction |
| `packages/hono/src/routes/chat.ts` | Rewritten with Foundry + CRUD endpoints | API routes for chat management |
| `packages/hono/src/types/contracts.ts` | ChatData, ChatRegistryContract interfaces | TypeScript types |
| `packages/hono/src/index.ts` | Updated to mount chat routes with chatRegistry | Server setup |
| `packages/nextjs/src/modules/chat/types/chat.ts` | Added agentId, onChainId, cid | Frontend type definitions |
| `packages/nextjs/services/api/chat-storage.ts` | Replaced localStorage with backend API | Chat persistence layer |
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` | Rewritten for on-chain persistence | Chat state management |
| `packages/nextjs/src/modules/chat/components/ui/chat-sidebar.tsx` | Fixed selectedConversationId type | Type fix |

### Key Patterns Discovered

1. **Contract pattern**: All registries follow the same structure: `mapping(bytes32 => Entity)` + owner index mapping + count + nonces + admin/pausable
2. **Credit consumption**: Cross-contract call to `CreditManager.consumeCreditsForOp(user, operation)` before entity creation/update
3. **User stats**: Cross-contract call to `UserRegistry.increment_*()` after entity creation
4. **ID generation**: `generate_id(vm, sender, nonce)` from `memorychain-common/src/helpers.rs` - deterministic hash of (sender + nonce + block context)
5. **Backend adapter pattern**: `publicClient.simulateContract()` → `walletClient.writeContract()` → `publicClient.waitForTransactionReceipt()` → read new entity ID
6. **Off-chain metadata**: Names were previously stored in JSON files (`metadata/agents.json`, `metadata/memories.json`), now stored on-chain for new entities
7. **WASM build**: `cargo stylus build` builds all contracts; `cargo stylus build --contract <name>` builds specific contract; direct `cargo build --release --target wasm32-unknown-unknown` works for individual crates

## Work Completed

### Tasks Finished

- [x] Created ChatRegistry contract with full CRUD operations
- [x] Added OP_CREATE_CHAT (7) and OP_UPDATE_CHAT (8) to CreditManager
- [x] Added create_chat/update_chat fee fields to CreditManager FeeConfig
- [x] Added total_chats, increment_chats, decrement_chats to UserRegistry
- [x] Added on-chain name field to MemoryRegistry and AgentRegistry
- [x] Updated all contract interfaces and return types for name fields
- [x] Created ChatError enum in memorychain-common
- [x] Added chat events (ChatCreated, ChatUpdated, ChatArchived, ChatRestored)
- [x] Created ChatRegistry adapter in backend
- [x] Rewrote chat route with Foundry provider, CRUD endpoints, dynamic credits
- [x] Updated frontend chat types (agentId per message, onChainId per conversation)
- [x] Replaced localStorage/IPFS chat persistence with backend API calls
- [x] Rewrote use-chat hook for on-chain persistence
- [x] Deployed all 7 contracts to Nitro dev node
- [x] Initialized all contracts and authorized cross-contract calls
- [x] Fixed type errors (ChatSidebar selectedConversationId, || and ?? mixing)

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `packages/stylus/contracts/chat-registry/src/lib.rs` | New contract with Chat struct, CRUD, views | Core chat tracking functionality |
| `packages/stylus/contracts/chat-registry/Cargo.toml` | New crate config | ChatRegistry Rust package |
| `packages/stylus/contracts/memorychain-common/src/types.rs` | Added OP_CREATE_CHAT, OP_UPDATE_CHAT | Operation codes for credit system |
| `packages/stylus/contracts/memorychain-common/src/errors.rs` | Added ChatError enum, InvalidName to MemoryError | Error handling |
| `packages/stylus/contracts/memorychain-common/src/events.rs` | Added chat events | On-chain event emission |
| `packages/stylus/contracts/memorychain-common/src/interfaces.rs` | Updated IMemoryRegistry, IAgentRegistry return types, added incrementChats to IUserRegistry | Cross-contract interfaces |
| `packages/stylus/contracts/credit-manager/src/lib.rs` | Added create_chat/update_chat fees, match arms | Credit consumption for chat ops |
| `packages/stylus/contracts/user-registry/src/lib.rs` | Added total_chats, increment_chats, decrement_chats, get_chat_count | User chat tracking |
| `packages/stylus/contracts/memory-registry/src/lib.rs` | Added name field, updated create_memory/get_memory | On-chain name storage |
| `packages/stylus/contracts/agent-registry/src/lib.rs` | Added name field, updated create_agent/get_agent | On-chain name storage |
| `packages/stylus/scripts/deploy.ts` | Added chat-registry to NAME_MAP and contracts list | Deployment |
| `packages/stylus/scripts/init_contracts.ts` | Added ChatRegistry init + auth | Contract initialization |
| `packages/hono/src/lib/contracts.ts` | Added ChatRegistry adapter, updated memory/agent adapters, updated FeeSchedule | Backend blockchain layer |
| `packages/hono/src/routes/chat.ts` | Complete rewrite with Foundry + CRUD | API endpoints |
| `packages/hono/src/types/contracts.ts` | Added ChatData, ChatRegistryContract, updated FeeSchedule | TypeScript types |
| `packages/hono/src/index.ts` | Added chatRegistry to AppDependencies, createChatRoutes, adapter creation | Server setup |
| `packages/nextjs/src/modules/chat/types/chat.ts` | Added agentId, onChainId, cid | Frontend types |
| `packages/nextjs/services/api/chat-storage.ts` | Complete rewrite with backend API calls | Chat persistence |
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` | Complete rewrite for on-chain persistence | Chat state management |
| `packages/nextjs/src/modules/chat/components/ui/chat-sidebar.tsx` | Fixed selectedConversationId type to string \| null | Type fix |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Store chat names on-chain | Off-chain metadata (like agents/memories before), On-chain | User requested on-chain names for all entities; also updating agents/memories to store names on-chain for new entities |
| Per-message agent tracking | Per-conversation, Per-message | User wants to change agents mid-conversation for different tasks |
| Dynamic credit pricing | Fixed credit cost, Dynamic (provider price + fee %) | User wants costs based on real AI provider pricing; switching to Microsoft Foundry for model variety |
| IPFS + on-chain CID for messages | IPFS only, On-chain only, IPFS + on-chain CID | Messages in IPFS for storage efficiency, CID on-chain for verifiability |
| Replace localStorage with on-chain | Keep both, Hybrid sync, Replace with on-chain | User chose full replacement for protocol-level persistence |

## Pending Work

### Immediate Next Steps

1. **Test the full flow end-to-end**: Create a chat, send messages, verify on-chain persistence, list chats, archive
2. **Verify Microsoft Foundry integration**: The chat route uses Foundry URL/Key from .env; ensure the API works correctly
3. **Check credit consumption**: Verify that create_chat and update_chat properly consume credits via CreditManager

### Blockers/Open Questions

- [ ] Microsoft Foundry API response format may differ from Mistral - test the actual response structure
- [ ] The `||` and `??` mixing fix was applied but there may be other similar patterns
- [ ] Frontend TypeScript has pre-existing errors (Zod compatibility, missing exports) unrelated to this work

### Deferred Items

- Migrating existing off-chain names (agents.json, memories.json) to on-chain for already-created entities
- SSE streaming for AI responses (currently simple request/response)
- Client-side encryption (planned separately)
- Testing with actual Mistral/Foundry models (requires valid API keys)

## Context for Resuming Agent

### Important Context

**The Nitro dev node is running** on `localhost:8547` with all 7 contracts deployed and initialized. The dev wallet is pre-funded.

**Deployed Contract Addresses (chain 412346):**
| Contract | Address |
|----------|---------|
| CreditManager | `0x2cc42f00be0fe77ff5ba18e6e039f373e62c13f2` |
| UserRegistry | `0x9a2256a8d40cc938e698dc495e33b2df33099e66` |
| MemoryRegistry | `0x7238563348c5c9783d8dee0231a0cb1b170d9d41` |
| AgentRegistry | `0x11ec9349b3c2dedfd2b2916125ee267574c93bf6` |
| ChatRegistry | `0x31a44b4f9184f921b9e6e2602520883f61edd9ad` |
| ContextRegistry | `0xe56bdc533e7ef3388b30c7323c35cbdb55303033` |
| AuditRegistry | `0x3e8fde46e0d00b3c6a0efb07244cae8e9526a395` |

**Contract initialization fully succeeded** (previous handoff had 3 failing initializations - now all pass).

**CreditManager fees for chat operations:**
- OP_CREATE_CHAT (7): 1 MC
- OP_UPDATE_CHAT (8): 1 MC

### Assumptions Made

- Docker is available and running
- `cast` (Foundry) is installed and in PATH
- The `.env` file in `packages/stylus/` is configured for Nitro dev (it is)
- The `.env` file in `packages/hono/` has FOUNDRY_URL and FOUNDRY_KEY (it does)
- WASM binaries were rebuilt and deployed with the new contracts

### Potential Gotchas

- **Nitro dev node is ephemeral**: Chain state resets on container restart. Redeploy contracts after restart.
- **ABI export fails**: `cargo stylus export-abi` doesn't work on Nitro dev. The deploy script handles this gracefully.
- **On-chain names only for new entities**: Existing memories/agents still have names in off-chain JSON. New ones get names on-chain.
- **Chat messages are NOT stored on-chain**: Only the chat metadata (name, CID, hash) is on-chain. Individual messages are sent to the AI provider and returned in the response. The `saveConversation` function in chat-storage.ts stores conversation data but the actual message history is not persisted to IPFS in the current implementation.
- **Foundry API format**: The chat route assumes OpenAI-compatible `/chat/completions` endpoint. If Foundry uses a different format, the response parsing may need adjustment.

## Environment State

### Tools/Services Used

- Docker (`nitro-node-stylus-dev` image, Nitro v3.11.0-a618155)
- Foundry (`cast` v1.7.1-dev)
- `cargo stylus` v0.10.8 (inside Docker)
- pnpm (monorepo package manager)
- Node.js / TypeScript (`ts-node` for deploy scripts)

### Active Processes

- Docker container `nitro-dev` running on port 8547 (detached)

### Environment Variables

- `RPC_URL_NITRO` = `http://localhost:8547` (in `packages/stylus/.env`)
- `PRIVATE_KEY_NITRO` = dev wallet private key (in `packages/stylus/.env`)
- `ACCOUNT_ADDRESS_NITRO` = `0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E` (in `packages/stylus/.env`)
- `FOUNDRY_URL` = Azure Foundry endpoint (in `packages/hono/.env`)
- `FOUNDRY_KEY` = Azure Foundry API key (in `packages/hono/.env`)

### Replication Commands

```bash
# Start node (includes chain setup: owner, ArbOS, CREATE2, Cache Manager, StylusDeployer)
cd nitro-devnode && bash ./run-dev-node.sh --stylus

# Deploy contracts
cd ../packages/stylus && pnpm deploy:contracts --network arbitrumNitro

# Run backend
cd ../hono && pnpm dev

# Run frontend
cd ../.. && pnpm next:dev
```

## Related Resources

- Nitro DevNode setup: `nitro-devnode/run-dev-node.sh`
- Contract deployment scripts: `packages/stylus/scripts/`
- Deployment artifacts: `packages/stylus/deployments/412346_latest.json`
- Frontend contract bindings: `packages/nextjs/contracts/deployedContracts.ts`
- Previous handoff: `2026-08-08-195254-stylus-wasm-rebuild-and-deploy.md`

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
