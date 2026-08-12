# Handoff: Fix Chat Model Selection, Zero-Hash Reverts & Agent Instructions Persistence

## Session Metadata
- Created: 2026-08-11 00:47:41
- Project: /home/cricro/store/projects/eth-lima/microcoders/app
- Branch: fix/flows
- Session duration: ~2 hours

### Recent Commits (for context)
  - 1ecde97 refactor: stateless backend and foundry
  - 5dd5599 fix: contracts and foundry
  - f51bc4e refactor: separate agents from models
  - 1bbf2e2 fix: registration and welcomes
  - 2142f8c fix: w3 session keys misgeneration

## Handoff Chain

- **Continues from**: [2026-08-10-233111-backend-stateless-foundry-ai-sdk.md](./2026-08-10-233111-backend-stateless-foundry-ai-sdk.md)
  - Previous title: Backend Stateless + Foundry via @ai-sdk/openai + Deployments Listing
- **Supersedes**: None

> Review the previous handoff for full context before filling this one.

## Current State Summary

Fixed four user-reported bugs in the chat/agents flow: (1) `/chat/send` returned Azure `DeploymentNotFound` because the frontend sent the stale default model `gpt-4o-mini` (undeployed) — `sendMessage`'s `useCallback` dep array was missing `selectedModel`; (2) `PUT /chat/:id` reverted with `ChatError: InvalidHash` because `chat-storage.ts` sent a zero hash (`0x` + `"00".repeat(32)`); (3) agent "Instrucciones personalizadas" disappeared on page reload because the kWallet (needed to decrypt the IPFS blueprint) was never persisted AND `app/(app)/agents/page.tsx` opened the edit form with the raw chain list item instead of the decrypted blueprint; (4) chat replies were empty ("No pude generar una respuesta.") because `maxOutputTokens: 500` was consumed by gpt-5-nano's reasoning tokens and `temperature` is unsupported for reasoning models. All changes are uncommitted on `fix/flows`. Hono check-types green, 82/82 tests pass; pre-existing `@ss/nextjs` errors in `grantPermissions` (useSiwe.ts) and `agent-form.tsx` zodResolver typing are untouched/known.

## Codebase Understanding

### Architecture Overview

- **Backend (`packages/hono`)**: Hono app; `/chat/send` uses `@ai-sdk/openai` `createOpenAI` + `generateText` against `FOUNDRY_OPENAI_URL`. Agent/memory/chat rich metadata lives in **encrypted IPFS blueprints** (frontend crypto layer); on-chain stores only name/cid/hash (+ description placeholder `""`).
- **Agent blueprint flow**: frontend `use-agent.ts` encrypts `{personality, instructions, description, icon, persistentMemory}` with a random AES key (`kData`), wraps `kData` in a wallet envelope encrypted with `kWallet` (PBKDF2 from a wallet signature), pins the JSON envelope base64 to IPFS via `POST /ipfs/pin`, then registers the returned cid/hash on-chain via `POST /agents`. Reads decrypt in reverse via `getAgent()`.
- **kWallet**: derived from a wallet signature. MUST be deterministic (fixed message), see Decisions.
- **Chat registry on-chain validation**: `updateChat`/`createChat` reject zero hashes (`ChatError: InvalidHash`) and empty names/CIDs; `updateChat` requires caller == owner.
- **Foundry**: `gpt-5-nano` (OpenAI) and `Phi-4-mini-instruct` (Microsoft) are the two live deployments; `GET /credits/ai-fees` returns them as the model dropdown.

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` | Chat page state + `sendMessage` | `selectedModel` added to dep array (was stale default bug) |
| `packages/nextjs/services/api/chat-storage.ts` | `saveConversation`/`updateConversation` | Now `keccak256`s conversation content instead of zero hash |
| `packages/nextjs/src/modules/chat/components/ui/chat-input.tsx` | Composer + model dropdown | Auto-selects first deployment if current model not in live list |
| `packages/hono/src/routes/chat.ts` | `/chat/send` | `maxOutputTokens: 2000`, no `temperature`, default model `gpt-5-nano` |
| `packages/nextjs/src/modules/agents/hooks/use-agent.ts` | Agent CRUD + blueprint encrypt/decrypt | Blueprint now carries `instructions` + `description`; `getAgent` restores them |
| `packages/nextjs/app/(app)/agents/page.tsx` | Active agents page | `handleEdit` now calls `getAgent()`; hydration effect on selection |
| `packages/nextjs/src/modules/agents/components/ui/agent-form.tsx` | Agent create/edit form | No longer merges instructions into personality on submit |
| `packages/nextjs/src/modules/auth/hooks/useSiwe.ts` | SIWE login + session restore | kWallet derived from fixed message; persisted/restored via session-storage |
| `packages/nextjs/services/crypto/session-storage.ts` | NEW kWallet/kRecovery localStorage persistence | Keyed per-address, base64-encoded |
| `packages/nextjs/src/modules/auth/components/AuthGate.tsx` | Session sync | Falls back to stored kWallet/kRecovery |
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` `saveAsMemory` | Memory creation | Now `keccak256`s message content instead of zero hash |

### Key Patterns Discovered

- **`sendMessage`/`saveConversation`/`saveAsMemory` all had zero-hash or stale-closure bugs** — any contract write that needs a content hash must hash real data with `keccak256(toHex(content))`; never send `0x` + `"00".repeat(32)`.
- **Reasoning models (gpt-5-nano)**: consume `maxOutputTokens` budget on internal reasoning; need generous budgets (≥2000) and reject `temperature`. The AI SDK logs `openai.responses` usage.
- **kWallet is per-wallet-deterministic**: derive from a fixed message signature, NOT the SIWE challenge (which has a random nonce → new key every login → old blueprints unreadable).
- **IPFS blueprint envelope shape**: `{ciphertext (b64), walletEnvelope (b64), recoveryEnvelope (b64)}`, JSON → TextEncoder → b64 → `pinToIpfs`. Retrieve reverses: `retrieveFromIpfs` → b64 → `base64ToArrayBuffer` → TextDecoder → parse.
- **Stylus revert strings are lowercase** (`"ChatError: invalid hash"`, etc.); viem surfaces them as raw messages.
- **`_`-prefixed params** satisfy `noUnusedParameters`; interface signatures live in `packages/hono/src/types/contracts.ts`.
- **Deployments listing** (`packages/hono/src/lib/foundry.ts`) is the single source of truth for the model dropdown; `[]` + `source:"error"` on failure.

## Work Completed

### Tasks Finished

- [x] Fixed `/chat/send` sending stale `gpt-4o-mini`: added `selectedModel` to `sendMessage`'s `useCallback` deps (`use-chat.ts:296`)
- [x] Added auto-select of first available deployment in `chat-input.tsx` when the current model isn't in the live Foundry list (prevents sending an undeployed model)
- [x] Fixed `PUT /chat/:id` zero-hash revert: `chat-storage.ts` now computes `keccak256` of conversation contents via `hashConversation()`
- [x] Fixed `saveAsMemory` zero-hash bug in `use-chat.ts` (`hashMemory()` via keccak256)
- [x] Persisted `kWallet`/`kRecovery` per-address in localStorage (`services/crypto/session-storage.ts`, new), wired into `useSiwe` login/checkSession/logout and `AuthGate`
- [x] Fixed `/auth/session` infinite loop: `checkSession` previously depended on `session.kWallet`/`kRecovery` (new Uint8Array ref each run → refetch loop); now loads from localStorage + `checkingRef` guard
- [x] Fixed agent "Instrucciones personalizadas" disappearing: blueprint now stores `instructions`+`description` separately; `getAgent` restores them; edit form hydrates via `getAgent`
- [x] Fixed `app/(app)/agents/page.tsx` editing from raw list item → now decrypts blueprint before opening the form; added selection-hydration effect
- [x] Fixed empty chat replies: `chat.ts` `maxOutputTokens: 2000`, removed `temperature: 0.7`, default model `gpt-5-nano`
- [x] Changed kWallet derivation to a **deterministic fixed-message signature** (was random-nonce SIWE signature)

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `packages/hono/src/routes/chat.ts` | `maxOutputTokens` 500→2000, dropped `temperature`, default model `gpt-4o-mini`→`gpt-5-nano` | Reasoning model needs budget; temperature unsupported |
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` | Added `selectedModel` to deps; `saveAsMemory` hashes content | Stale closure + zero-hash fixes |
| `packages/nextjs/services/api/chat-storage.ts` | `hashConversation()` via keccak256; imports from viem | Replace zero hash in `saveConversation` |
| `packages/nextjs/src/modules/chat/components/ui/chat-input.tsx` | Auto-select first deployment if selected not in list | Prevent undeployed-model sends |
| `packages/nextjs/src/modules/agents/hooks/use-agent.ts` | Blueprint `instructions`+`description`; `getAgent` restores; create/update store them | Persist custom instructions |
| `packages/nextjs/src/modules/agents/types/agent.ts` | Added `instructions?: string` to `AgentSchema` | Type support for instructions |
| `packages/nextjs/src/modules/agents/components/ui/agent-form.tsx` | Stop merging instructions into personality | Keep fields separate for round-trip |
| `packages/nextjs/app/(app)/agents/page.tsx` | `handleEdit` uses `getAgent()`; hydration effect | Edit form shows persisted fields |
| `packages/nextjs/src/modules/auth/hooks/useSiwe.ts` | kWallet from fixed-message signature; persist/restore/clear kWallet | Deterministic + persistent key |
| `packages/nextjs/src/modules/auth/components/AuthGate.tsx` | Fallback to stored kWallet/kRecovery | Session restore keeps key |
| `packages/nextjs/services/crypto/session-storage.ts` | NEW per-address localStorage persistence | Survive page reload |
| `packages/nextjs/contracts/deployedContracts.ts` | Contract addresses updated (pre-existing, from prior session) | Redeployed contracts |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Derive kWallet from fixed-message signature | Keep SIWE nonce signature; derive from address; skip encryption | SIWE signature has a random nonce → new kWallet every login → old blueprints unreadable. Fixed message = deterministic per wallet, matches original `FRONTEND_PLAN.md` design |
| Persist kWallet in localStorage per-address | sessionStorage; re-derive on every load | localStorage survives reloads; base64 keyed by address; cleared on logout |
| `keccak256` content for chat/memory hashes | Random bytes; fake hash | Contract rejects zero hash; content hash is verifiable and non-zero |
| `maxOutputTokens: 2000`, no temperature | Keep 500 + temperature 0.7 | gpt-5-nano burns budget on reasoning → empty text; temperature unsupported (AI SDK warns) |
| Auto-select first Foundry deployment when current model missing | Hardcode default | Prevents sending undeployed models; dropdown is source of truth |
| Store `instructions`/`description` in blueprint separately | Merge into personality string | Avoids lossy merge/split round-trip |

## Pending Work

### Immediate Next Steps

1. **Verify the deterministic kWallet fix end-to-end**: user must log out and log in ONCE (the fixed-message signature produces a new stable kWallet). Old blueprints (encrypted under the old nonce-derived key) will NOT decrypt — user explicitly said no need to preserve data; recreate test agents.
2. **Confirm `/chat/send` returns a real reply** for `gpt-5-nano` with the new `maxOutputTokens: 2000` (tested successfully via SDK: "Soy ChatGPT, un modelo...").
3. **Confirm agent edit round-trip**: create agent with "Instrucciones personalizadas", reload, click Editar — the text should persist (requires kWallet from new login).
4. **Run `pnpm --filter @ss/nextjs exec tsc --noEmit`** and verify only the two known pre-existing `useSiwe` `grantPermissions` errors + `agent-form.tsx` zodResolver typing errors remain.
5. **Commit the working tree** (currently all uncommitted on `fix/flows`).

### Blockers/Open Questions

- [ ] Does the deterministic fixed-message signature prompt add friction in the login flow (wallet signs twice: SIWE challenge + unlock message)? Confirm UX is acceptable.
- [ ] Pre-existing `@ss/nextjs` type errors (2× `grantPermissions` in `useSiwe.ts`, 3× `agent-form.tsx` zodResolver/implicit-any) remain unaddressed — out of scope unless requested.

### Deferred Items

- Streaming chat responses (Phase 5, never implemented)
- Tool execution engine
- Model-specific system prompts
- Wiring the dormant `createUserOpAdapters()` factory into session-key routes
- Cleaning ~75 pre-existing repo-wide `biome check` failures and ~10 pre-existing `@ss/nextjs` type errors

## Context for Resuming Agent

### Important Context

- **All changes are UNCOMMITTED.** Run `git status`/`git diff` before doing anything.
- **Env vars (names only)**: `FOUNDRY_OPENAI_URL`, `FOUNDRY_PROJECT_URL`, `FOUNDRY_KEY`, `FOUNDRY_API_VERSION`, `DEV_PRIVATE_KEY`, `RPC_URL`, `BUNDLER_URL`, `IPFS_API_URL`, `CORS_ORIGIN`, `ENABLE_DEV_WALLET_AUTH`, `PORT`, `REDIS_URL`. Never print `FOUNDRY_KEY`.
- **Services currently running**: Hono backend :3001, Next.js :3000, IPFS :5001, Nitro DevNode :8547.
- **Live Foundry deployments**: `gpt-5-nano` (OpenAI) + `Phi-4-mini-instruct` (Microsoft). Only these two are valid `model` values for `/chat/send`.
- **kWallet derivation must stay deterministic** — do not revert to signing the SIWE challenge message.
- **User session**: `0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E`, cookie `session=78bb1587c3241eb6c56f2b59da0c5236` (dev; ephemeral).
- **Verification commands**: `pnpm --filter @ss/hono check-types`, `pnpm --filter @ss/hono test` (82/82), `pnpm --filter @ss/nextjs exec tsc --noEmit`.

### Assumptions Made

- User does NOT need to preserve existing encrypted data (test agents) — explicitly stated.
- `kWallet` persisted in localStorage is acceptable security-wise for this dev stage (clear on logout).
- Contract addresses in `packages/nextjs/contracts/deployedContracts.ts` (updated in prior session) are current.
- `description` remains `""` from the chain API; real description now lives in the blueprint (restored via `getAgent`).

### Potential Gotchas

- **AI SDK v7 names**: use `maxOutputTokens`, `result.usage?.inputTokens/outputTokens`. `maxTokens`/`promptTokens` do NOT exist.
- **`createOpenAI` with empty env doesn't throw**; `/chat/send` guards on `FOUNDRY_OPENAI_URL`/`FOUNDRY_KEY` (returns `CONFIG_ERROR`).
- **Azure OpenAI auth needs the `api-key` header** (Authorization fails) — passed via `headers: { "api-key": ... }` in `chat.ts`.
- **Do NOT bind port during tests**: `serve()` in `index.ts` is wrapped in `if (!process.env.VITEST)`.
- **Zero hashes revert on-chain**: chat/memory/agent writes must pass real non-zero keccak hashes.
- **Reasoning models**: generous `maxOutputTokens`, no `temperature`.
- **`_`-prefixed params** are deliberate (satisfy `noUnusedParameters`); keep `packages/hono/src/types/contracts.ts` signatures in sync.
- **`/auth/session` loop prevention**: `checkSession` must NOT depend on `session.kWallet`/`kRecovery` (Uint8Array refs change every `setSession`). It reads from localStorage directly + `checkingRef` guard.
- `packages/hono/.env` is gitignored — keep secrets out of committed files.

## Environment State

### Tools/Services Used

- Azure AI Foundry (OpenAI-compatible endpoint + deployments listing)
- Hono backend :3001, Next.js frontend :3000, IPFS :5001, Nitro DevNode :8547
- pnpm 9.15.4, Node v24.18.0

### Active Processes

- Hono dev server on :3001 (restart after editing `chat.ts` to pick up changes)
- Next.js dev server on :3000 (restart to pick up frontend changes)

### Environment Variables

- `FOUNDRY_OPENAI_URL`, `FOUNDRY_PROJECT_URL`, `FOUNDRY_KEY`, `FOUNDRY_API_VERSION`
- `DEV_PRIVATE_KEY`, `RPC_URL`, `BUNDLER_URL`, `IPFS_API_URL`, `CORS_ORIGIN`, `ENABLE_DEV_WALLET_AUTH`, `PORT`, `REDIS_URL`

## Related Resources

- Previous handoff: `./2026-08-10-233111-backend-stateless-foundry-ai-sdk.md` (Foundry + stateless backend context)
- `packages/nextjs/FRONTEND_PLAN.md` — original crypto design (`deriveKWallet` fixed-message intent at line 75)
- `packages/nextjs/services/crypto/keys.ts`, `envelope.ts`, `utils.ts`, `session-storage.ts` — key derivation + envelope crypto
- `packages/stylus/contracts/chat-registry/src/lib.rs` — `updateChat` validation (rejects zero hash)
- `packages/stylus/contracts/memorychain-common/src/errors.rs` — `ChatError` revert strings

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
