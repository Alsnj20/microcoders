# Handoff: Backend Stateless + Foundry via @ai-sdk/openai + Deployments Listing

## Session Metadata
- Created: 2026-08-10 23:31:11
- Project: /home/cricro/store/projects/eth-lima/microcoders/app
- Branch: fix/flows
- Session duration: ~1.5 hours

### Recent Commits (for context)
  - 5dd5599 fix: contracts and foundry
  - f51bc4e refactor: separate agents from models
  - 1bbf2e2 fix: registration and welcomes
  - 2142f8c fix: w3 session keys misgeneration
  - 6e94bae feat: w3 session keys

## Handoff Chain

- **Continues from**: [2026-08-10-220951-fix-contract-and-foundry-errors.md](./.claude/handoffs/2026-08-10-220951-fix-contract-and-foundry-errors.md)
  - Previous title: Fix Contract Bytes & Chat Creation Errors
- **Supersedes**: None

> All work this session is **uncommitted** on branch `fix/flows`.

## Current State Summary

Resolved two follow-ups from the previous session: (1) the Hono backend no longer stores ANY local metadata JSONs — agent/memory/chat name+description come from the chain (description is now `""`) and context links were moved fully on-chain to the already-deployed `context-registry` contract; (2) Foundry integration now uses `@ai-sdk/openai` (`createOpenAI` + `generateText`) against `FOUNDRY_OPENAI_URL` instead of manual `fetch` to `FOUNDRY_URL`, and `GET /credits/ai-fees` returns LIVE Foundry deployments (via plain REST `GET {FOUNDRY_PROJECT_URL}/deployments?api-version=...` with an `api-key` header) decorated with costs from a new deployment-name→price map. `node_modules` was wiped and reinstalled cleanly (the ad-hoc `@azure/ai-projects`/`@azure/core-auth` packages are gone and unused). `@ss/hono` `check-types` is green and all 82 tests pass.

## Codebase Understanding

### Architecture Overview

- **Backend (`packages/hono`)**: Hono app; contract writes via viem `simulateContract`+`writeContract` using `DEV_PRIVATE_KEY`; reads via `readContract`. UserOp/session-key variants of each registry adapter exist in `packages/hono/src/lib/contracts.ts` (`createUserOpAdapters`, currently not wired into routes).
- **No more backend persistence**: agents/memories/chats are read from Stylus contracts; `description` is intentionally `""` (not on-chain). Context links live ONLY in the on-chain `context-registry` contract (`0xd1aa1b583f2c086d0964600e0c79a95acbc30a65`).
- **Foundry**: two distinct endpoints. `FOUNDRY_OPENAI_URL` (`https://<res>.openai.azure.com/openai/v1`) for chat completions via `@ai-sdk/openai`. `FOUNDRY_PROJECT_URL` (`https://<res>.services.ai.azure.com/api/projects/default`) for the deployments listing REST call. Both share `FOUNDRY_KEY`. `FOUNDRY_API_VERSION` defaults to `2025-05-01`.
- **Frontend (`packages/nextjs`)**: chat composer fetches `/credits/ai-fees` on mount; if no deployments are returned, the composer is disabled and shows "No providers available".

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `packages/hono/src/lib/contracts.ts` | All viem registry adapters + UserOp factory | Metadata layer removed; context adapter rewritten on-chain; `contextAbi` loaded from `packages/stylus/deployments/context-registry` |
| `packages/hono/src/lib/foundry.ts` (NEW) | `listFoundryDeployments()` REST client | Source of the model dropdown; `[]` on missing env / HTTP error |
| `packages/hono/src/lib/prices.ts` (NEW) | `MODEL_PRICES` map + `getModelCost()` | Keyed by deployment name; default cost 1 MC |
| `packages/hono/src/routes/credits.ts` | `/credits/ai-fees` | Maps deployments → `{provider, model, label, costInMC, deploymentName, modelName, modelVersion}`; `createCreditRoutes(creditManager, getDeployments = listFoundryDeployments)` is injectable |
| `packages/hono/src/routes/chat.ts` | `/chat/send` | Now `createOpenAI({ baseURL: FOUNDRY_OPENAI_URL, apiKey, headers:{ "api-key" } })` + `generateText` |
| `packages/hono/src/index.ts` | App wiring + server bootstrap | Added `foundryDeployments` dep; `serve(...)` guarded with `if (!process.env.VITEST)` |
| `packages/nextjs/src/modules/chat/components/ui/chat-input.tsx` | Composer | Disables input+send when no providers available |
| `packages/stylus/contracts/context-registry/src/lib.rs` | Context contract source | Reverts: `ContextError: already linked / link not found / memory not found / agent not found / link not active / already disabled / already enabled` (lowercase) |

### Key Patterns Discovered

- **AI SDK v7 API changes**: `maxTokens` → `maxOutputTokens`; usage is `inputTokens`/`outputTokens`/`totalTokens` (NOT `promptTokens`/`completionTokens`).
- **Azure OpenAI auth**: requires the `api-key` header (sending the key in an Authorization header fails). Passed via `createOpenAI({ ..., headers: { "api-key": FOUNDRY_KEY } })`.
- **Stylus revert matching**: contract errors surface in viem messages as lowercase strings (e.g. `"ContextError: already linked"`); adapters `.toLowerCase()` and `includes(...)` to map to the route's expected `ALREADY_LINKED` / `LINK_NOT_FOUND` / `ALREADY_DISABLED` / `ALREADY_ENABLED` codes.
- **Context list filtering**: `unlink`/`disable` do NOT remove the context id from the agent's `agent_contexts` index — `getAgentContexts` filters to `enabled === true` so the UI list stays correct.
- **`_`-prefixed params**: `noUnusedParameters` (tsconfig) forces renaming unused params (e.g. `_owner`, `_description`) in interface implementations; interface signatures in `packages/hono/src/types/contracts.ts` were left unchanged.
- **Tests import `index.ts`**: which used to `serve()` on port 3001 at module scope → `EADDRINUSE` when a dev server is running. Guarded with `if (!process.env.VITEST)`.

## Work Completed

### Tasks Finished

- [x] Wiped `node_modules` (root + all 3 packages) and deleted stray tracked `packages/nextjs/package-lock.json`; clean `pnpm install` (lockfile unchanged, `@azure/*` ad-hoc packages dropped)
- [x] Removed the entire metadata layer from `contracts.ts` (`META_DIR`, `agents.json`/`memories.json`/`chats.json`/`links.json`, `loadMeta`/`saveMeta`, all Maps) — backend is now stateless
- [x] Rewrote `createContextRegistryAdapter()` to use the deployed on-chain `context-registry` contract (viem reads/writes, revert→error-code mapping, `getAgentContexts` filters enabled links)
- [x] Added `createContextRegistryUserOpAdapter` to `UserOpAdapterFactory`/`createUserOpAdapters` (session-key parity)
- [x] Created `packages/hono/src/lib/foundry.ts` (REST deployments listing, `api-key` header, `FOUNDRY_API_VERSION` default `2025-05-01`) and `packages/hono/src/lib/prices.ts` (deployment-name→MC map)
- [x] `GET /credits/ai-fees` now serves live deployments (empty + `source:"error"` on failure); made injectable via `createApp({ foundryDeployments })`
- [x] `/chat/send` now uses `@ai-sdk/openai` `createOpenAI` + `generateText` (same response shape: `reply`, `model`, `usage`, `creditsUsed`)
- [x] Frontend `chat-input.tsx`: "Loading providers…" → disabled composer + "No providers available" when no deployments
- [x] `.env.example` updated to `FOUNDRY_OPENAI_URL` / `FOUNDRY_PROJECT_URL` / `FOUNDRY_KEY` / `FOUNDRY_API_VERSION`
- [x] Fixed pre-existing `noUnusedParameters`/unused-import errors (`packages/hono/src/lib/contracts.ts`, `packages/hono/src/lib/ipfs.ts`, `packages/hono/src/routes/ipfs.ts`, tests) so `@ss/hono check-types` is green
- [x] Updated `credits.test.ts` (mock deployments injection, live/empty assertions); 82/82 tests pass

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `packages/hono/src/lib/contracts.ts` | Removed metadata JSON layer & all Maps; on-chain context adapter; context UserOp adapter; `_`-prefixed unused params; `description: ""`, on-chain names | Backend stateless; links on-chain |
| `packages/hono/src/lib/foundry.ts` | NEW deployment listing client | Source of model dropdown |
| `packages/hono/src/lib/prices.ts` | NEW price map + `getModelCost()` | Cost per deployment |
| `packages/hono/src/routes/credits.ts` | `AI_FEES` removed; `/ai-fees` → live deployments; injectable `getDeployments` | Show real deployments to users |
| `packages/hono/src/routes/chat.ts` | Manual `fetch(FOUNDRY_URL/chat/completions)` → `createOpenAI` + `generateText`; removed unused `chatId` | Use `@ai-sdk/openai` |
| `packages/hono/src/index.ts` | `foundryDeployments` dep + `VITEST` guard on `serve()` | Testability + no EADDRINUSE in tests |
| `packages/hono/src/lib/ipfs.ts` | `name` → `_name` | noUnusedParameters |
| `packages/hono/src/routes/ipfs.ts` | Drop unused `createIpfsClient` import | Cleanup |
| `packages/hono/.env.example` | `FOUNDRY_URL` → new `FOUNDRY_*` vars | Reflect new config |
| `packages/hono/src/__tests__/credits.test.ts` | Mock deployments injection; live/empty tests; mock type fix | Match new endpoint |
| `packages/hono/src/__tests__/{app,ipfs,memories}.test.ts` | Import/param cleanup; added `description` to memory mock | Green typecheck |
| `packages/nextjs/src/modules/chat/components/ui/chat-input.tsx` | Loading/empty/disabled states for provider dropdown | No-provider gate |
| `packages/nextjs/package-lock.json` | DELETED | npm leftover, not part of pnpm workspace |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Remove metadata stores entirely for agents/memories/chats (name on-chain, `description: ""`) | Keep in-memory Maps; fetch descriptions from IPFS | User chose full removal; simplest stateless backend |
| Move context links on-chain via existing `context-registry` contract | Store links in agent IPFS blueprint; keep in-memory only | Contract already deployed + fully featured; no re-pin/decrypt per change; matches "removal of json as storage" trajectory |
| Price map keyed by deployment name | Key by modelName | Deployment `name` is what `/chat/send` receives as `model` |
| `/ai-fees` returns empty list on failure | Fall back to static price-map entries | User chose empty; frontend hard-blocks interaction instead |
| Frontend blocks the composer when no providers | Show a default model option | User requirement: "no providers available" + no interaction |
| Deployments via plain REST fetch | `@azure/ai-projects` SDK with `AzureKeyCredential` | User explicitly switched to the REST approach; avoids the extra SDK |
| `FOUNDRY_API_VERSION` default `2025-05-01` (env-overridable) | `2024-10-21` (initial snippet) | User-specified default |

## Pending Work

### Immediate Next Steps

1. **Restart the Hono backend** (a dev server is/was running on :3001 with old code — kill and restart via `pnpm --filter @ss/hono dev`).
2. **Verify `GET /credits/ai-fees`** returns live deployments. If the Foundry resource rejects `api-version=2025-05-01` (400), set `FOUNDRY_API_VERSION` in `packages/hono/.env` to the accepted value and confirm the response shape (`value[]` with `name`, `modelName`, `modelPublisher`).
3. **Test `/chat/send`** with `@ai-sdk/openai` — confirm the `api-key` header authenticates against `FOUNDRY_OPENAI_URL` and that a deployment name (from the dropdown) works as `model`.
4. **Test `/context/link`** writes on-chain: dev wallet owns all agents/memories so the contract's ownership check passes; note the contract charges credits (`OP_LINK_MEMORY`). Confirm `getAgentContexts` returns only enabled links.
5. **Frontend smoke test**: stop/break the deployments fetch and confirm the composer is disabled with "No providers available".

### Blockers/Open Questions

- [ ] Does the Foundry resource accept `api-version=2025-05-01` for `/deployments`? (Test via step 2.)
- [ ] Does `@ai-sdk/openai` + `api-key` header work against the Azure OpenAI-compatible endpoint as-is, or does it need `organization`/`project` or a trailing path tweak?
- [ ] Description is now always `""` from the API — is that acceptable for the UI long-term, or should descriptions be fetched from the IPFS blueprint (cid)?

### Deferred Items

- Streaming chat responses (Phase 5, never implemented)
- Tool execution engine
- Model-specific system prompts
- Wiring the dormant `createUserOpAdapters()` factory into the session-key routes (exists but unused)
- Cleaning the ~75 pre-existing repo-wide `biome check` failures and ~10 pre-existing `@ss/nextjs` type errors (unrelated to this session)

## Context for Resuming Agent

### Important Context

- **All changes are UNCOMMITTED.** Run `git status`/`git diff` before doing anything.
- **Env vars (names only)**: `FOUNDRY_OPENAI_URL` = `https://foundry-eth-lima.openai.azure.com/openai/v1`, `FOUNDRY_PROJECT_URL` = `https://foundry-eth-lima.services.ai.azure.com/api/projects/default`, `FOUNDRY_KEY`, `FOUNDRY_API_VERSION` (default `2025-05-01`). Never print `FOUNDRY_KEY`.
- **`context-registry` is already deployed** at `0xd1aa1b583f2c086d0964600e0c79a95acbc30a65`; ABI at `packages/stylus/deployments/context-registry` is loaded as `contextAbi` in `contracts.ts`. If the contract is redeployed, update `packages/stylus/deployments/412346_latest.json`.
- **Linking now costs credits on-chain** and is ownership-validated by the contract (caller must own both agent and memory). In dev, all writes go through `DEV_PRIVATE_KEY`, so this holds.
- **`/chat/send` response shape is unchanged** from the frontend's perspective: `{ reply, model, usage, creditsUsed }`.
- **Verification commands**: `pnpm --filter @ss/hono check-types`, `pnpm --filter @ss/hono test` (82/82), `npx biome check <new files>`.
- **Wipe procedure used**: `rm -rf node_modules packages/*/node_modules && rm -f packages/nextjs/package-lock.json && pnpm install`.

### Assumptions Made

- Deployment names returned by the Foundry `/deployments` API are valid `model` identifiers for the OpenAI-compatible endpoint.
- Azure OpenAI accepts the `api-key` header (standard) — untested yet.
- `description: ""` for agents/memories is acceptable (it was only stored in the removed JSONs).
- Pre-existing `biome check` and `@ss/nextjs` typecheck failures are out of scope and were left untouched.

### Potential Gotchas

- **AI SDK v7 names**: use `maxOutputTokens`, `result.usage?.inputTokens`/`outputTokens` — `maxTokens`/`promptTokens` do NOT exist and will fail typecheck.
- **Stylus error strings are lowercase** — adapters must match `"already linked"`, `"link not found"`, etc., not the Rust variant names.
- **`getAgentContexts` must filter `enabled === true`** — unlink/disable leave stale entries in the contract's per-agent index.
- **`createOpenAI` with empty env values doesn't throw at construction**; the `/chat/send` handler guards on `FOUNDRY_OPENAI_URL`/`FOUNDRY_KEY` first (returns `CONFIG_ERROR`).
- **Do NOT bind the port during tests**: the `serve()` call in `index.ts` is wrapped in `if (!process.env.VITEST)`.
- **`_`-prefixed params** are deliberate (satisfy `noUnusedParameters`); keep interface signatures in `packages/hono/src/types/contracts.ts` in sync when changing adapters.
- `packages/hono/.env` is gitignored — keep secrets out of any committed files.

## Environment State

### Tools/Services Used

- Azure AI Foundry (OpenAI-compatible endpoint + project deployments API)
- Hono backend :3001, Next.js frontend :3000, IPFS :5001, Nitro DevNode :8547
- pnpm 9.15.4, Node v24.18.0

### Active Processes

- Possibly a stale Hono dev server on :3001 (restart before testing)

### Environment Variables

- `FOUNDRY_OPENAI_URL`, `FOUNDRY_PROJECT_URL`, `FOUNDRY_KEY`, `FOUNDRY_API_VERSION`
- `DEV_PRIVATE_KEY`, `RPC_URL`, `BUNDLER_URL`, `IPFS_API_URL`, `CORS_ORIGIN`, `ENABLE_DEV_WALLET_AUTH`, `PORT`, `REDIS_URL`

## Related Resources

- Previous handoff: `./.claude/handoffs/2026-08-10-220951-fix-contract-and-foundry-errors.md` (had the `api-version` blocker now addressed)
- `packages/stylus/contracts/context-registry/src/lib.rs` — context contract logic
- `packages/stylus/contracts/memorychain-common/src/errors.rs:97` — `ContextError` revert strings
- `packages/stylus/deployments/context-registry` — on-chain ABI

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
