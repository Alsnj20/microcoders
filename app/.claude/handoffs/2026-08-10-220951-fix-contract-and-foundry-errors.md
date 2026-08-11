# Handoff: Fix Contract Bytes & Chat Creation Errors

## Session Metadata
- Created: 2026-08-10 22:09:51
- Project: /home/cricro/store/projects/eth-lima/microcoders/app
- Branch: fix/flows
- Session duration: ~15 minutes

### Recent Commits (for context)
  - f51bc4e refactor: separate agents from models
  - 1bbf2e2 fix: registration and welcomes
  - 2142f8c fix: w3 session keys misgeneration
  - 6e94bae feat: w3 session keys
  - 9a09a08 fix: remove hardcoded wallet

## Handoff Chain

- **Continues from**: [2026-08-08-233322-decouple-agent-from-model.md](./2026-08-08-233322-decouple-agent-from-model.md)
  - Previous title: Decouple Agent Creation from AI Model/Provider
- **Supersedes**: None

## Current State Summary

Fixed two contract-level bugs that blocked agent/memory creation and chat creation. The IPFS client was returning SHA-256 hashes without `0x` prefix, causing viem to interpret 64 hex chars as `bytes64` instead of `bytes32`. The chat creation route was sending a zero hash (`0x000...000`), which the contract explicitly rejects. Both fixes are applied. A third error (Azure Foundry missing `api-version` query parameter) was identified but the fix was reverted at user request — it remains pending.

## Codebase Understanding

### Architecture Overview

- **Contract calls**: Backend uses viem's `simulateContract` + `writeContract` to interact with Stylus contracts on Nitro DevNode. ABI files live in `packages/stylus/deployments/`.
- **Hash encoding**: All contracts expect `bytes32` (32 bytes = 64 hex chars with `0x` prefix). viem requires `0x`-prefixed hex strings to correctly encode as `bytes32`.
- **IPFS flow**: Frontend encrypts blueprint → base64 → `pinToIpfs()` → Hono backend → IPFS node. Backend returns `{ cid, hash, size }`. Hash is SHA-256 of the data.
- **Chat creation**: Chats are created with a placeholder CID (`chat-init-{timestamp}`) and a random hash. The contract requires non-zero hash.

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `packages/hono/src/lib/ipfs.ts` | IPFS pin/retrieve client | Source of hash generation — was missing `0x` prefix |
| `packages/hono/src/routes/chat.ts` | Chat CRUD + AI messaging | Had zero-hash bug; also needs `api-version` for Foundry |
| `packages/hono/src/routes/agents.ts` | Agent CRUD routes | Validates hash format with `.replace("0x","").length === 64` |
| `packages/hono/src/routes/memories.ts` | Memory CRUD routes | Same hash validation pattern |
| `packages/hono/src/lib/contracts.ts` | Contract adapter (viem) | Passes hash as `hash as \`0x${string}\`` — type assertion only |
| `packages/stylus/contracts/chat-registry/src/lib.rs` | Chat contract source | Rejects `FixedBytes::ZERO` at line 130 |
| `packages/stylus/deployments/chat-registry` | Chat ABI | `createChat(string, string, bytes32)` |

### Key Patterns Discovered

- **Hash validation**: All routes use `z.string().refine((v) => v.replace("0x", "").length === 64)` — works with or without prefix
- **Contract hash passing**: `hash as \`0x${string}\`` is a TypeScript type assertion, not runtime encoding — viem needs the actual `0x` prefix in the string
- **Dev vs Production hashes**: Frontend `generateDevHash()` already returns `0x`-prefixed; IPFS `digest("hex")` does not
- **Chat creation is special**: Unlike agents/memories (which pin to IPFS first), chats are created with placeholder CID/hash then updated later

## Work Completed

### Tasks Finished

- [x] Fixed `bytes64` vs `bytes32` mismatch — added `0x` prefix to IPFS hash output
- [x] Fixed chat creation zero-hash rejection — use `generateId()` instead of `"0x" + "00".repeat(32)`
- [x] Updated IPFS test expectations to match `0x`-prefixed hash format

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `packages/hono/src/lib/ipfs.ts:21` | Added `"0x" +` prefix to `digest("hex")` | viem needs `0x` prefix to encode as `bytes32` |
| `packages/hono/src/__tests__/ipfs.test.ts:20` | Regex `/^[a-f0-9]{64}$/` → `/^0x[a-f0-9]{64}$/` | Match new `0x`-prefixed format |
| `packages/hono/src/__tests__/ipfs-routes.test.ts:21` | Same regex update | Match new `0x`-prefixed format |
| `packages/hono/src/routes/chat.ts:58` | `"0x" + "00".repeat(32)` → `generateId()` | Contract rejects zero hash |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Fix hash at IPFS source | Fix at each contract call site, fix at route validation | Fixing at source (`ipfs.ts`) is cleanest — all consumers benefit |
| Use `generateId()` for chat hash | Generate real SHA-256 of empty content, use timestamp-based hash | `generateId()` already exists, produces valid random `bytes32` |

## Pending Work

### Immediate Next Steps

1. **Azure Foundry `api-version` query parameter** — `FOUNDRY_URL/chat/completions` fails with `Missing required query parameter: api-version`. Need to append `?api-version=2024-12-01-preview` (or similar) to the fetch URL in `chat.ts:243`. May also need `FOUNDRY_API_VERSION` env var.
2. **Restart backend** to pick up the IPFS and chat hash fixes
3. **Test full flow**: create agent → create memory → create chat → send message

### Blockers/Open Questions

- [ ] What `api-version` does this Azure Foundry instance expect? Check Azure docs or the Foundry portal.
- [ ] Should `FOUNDRY_API_VERSION` be an env var or hardcoded?
- [ ] Are there other Foundry API calls that need the same fix? (Currently only `chat/send` calls Foundry)

### Deferred Items

- Streaming chat responses (Phase 5)
- Tool execution engine
- Model-specific system prompts

## Context for Resuming Agent

### Important Context

The Azure Foundry error `Missing required query parameter: api-version` is the last blocker. The URL in `chat.ts:243` needs the query parameter appended. Common Azure API versions: `2024-02-01`, `2024-06-01`, `2024-10-01`, `2024-12-01-preview`. The user reverted the fix attempt — they may want to investigate the correct version first or handle it differently.

The `FOUNDRY_URL` value is `https://foundry-eth-lima.services.ai.azure.com/api/projects/default` — this is an Azure AI Foundry endpoint, not standard Azure OpenAI. The API version format may differ.

### Assumptions Made

- All models in `AI_FEES` are deployed on Azure Foundry
- The `0x` prefix fix for IPFS hashes resolves the `bytes64` error for agents AND memories (both use `pinToIpfs`)
- The `generateId()` function produces valid hashes that the contract accepts (non-zero, correct length)

### Potential Gotchas

- The IPFS hash change affects ALL existing agents/memories that were stored with non-prefixed hashes — reading them back from contract will still work (contract stores raw bytes32), but the `bytes32ToHex` helper in `contracts.ts` may need to handle both formats
- Tests require a running IPFS node (`localhost:5001`) — they'll fail without it
- The Foundry API version might need to match a specific deployment — wrong version could cause different errors

## Environment State

### Tools/Services Used

- Azure Foundry (FOUNDRY_URL, FOUNDRY_KEY in .env)
- Hono backend server at :3001
- Next.js frontend at :3000
- IPFS node at localhost:5001
- Nitro DevNode at localhost:8547

### Active Processes

- None (development session completed)

### Environment Variables

- `FOUNDRY_URL` — Azure Foundry endpoint URL
- `FOUNDRY_KEY` — Azure Foundry API key
- `FOUNDRY_API_VERSION` — (NOT YET ADDED) Needed for Foundry API calls

## Related Resources

- `packages/hono/src/lib/ipfs.ts` — Fixed hash generation
- `packages/hono/src/routes/chat.ts` — Fixed zero-hash; needs api-version fix
- `packages/stylus/contracts/chat-registry/src/lib.rs:130` — Zero hash rejection logic
- `packages/hono/src/routes/credits.ts` — AI_FEES pricing table
- Previous handoff: `2026-08-08-233322-decouple-agent-from-model.md`

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
