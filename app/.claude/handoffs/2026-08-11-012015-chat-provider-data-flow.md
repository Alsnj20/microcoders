# Handoff: Chat → AI Provider Data Flow (Personas, Linked Memories, Chat History)

## Session Metadata
- Created: 2026-08-11 01:20:15
- Project: /home/cricro/store/projects/eth-lima/microcoders/app
- Branch: fix/flows
- Session duration: ~30 min (interview-me alignment + implementation)

### Recent Commits (for context)
  - 507f44c fix: chat models
  - 1ecde97 refactor: stateless backend and foundry
  - 5dd5599 fix: contracts and foundry
  - f51bc4e refactor: separate agents from models
  - 1bbf2e2 fix: registration and welcomes

## Handoff Chain

- **Continues from**: [2026-08-11-004741-fix-chat-models-agents-persistence.md](./2026-08-11-004741-fix-chat-models-agents-persistence.md)
  - Previous title: Fix Chat Model Selection, Zero-Hash Reverts & Agent Instructions Persistence
- **Supersedes**: None

> Review the previous handoff for full context before filling this one.

## Current State Summary

Reworked the chat→AI-provider data flow so the model is a plain branded chatbot instead of a "MemoryChain AI assistant that can manage agents/memories". `/chat/send` no longer queries the chain for agent/memory/context metadata (which was useless — the chain only stores name/cid/hash, and descriptions are empty). Instead the frontend decrypts the selected agent's IPFS blueprint (personality/instructions → the **system prompt**) and the linked memories' IPFS blueprints (contents → a leading context message), and sends `{ systemPrompt, memories[], history[], message, chatId, model }` to the backend. The backend assembles `system` + `messages` and calls `generateText`. All changes are UNCOMMITTED on `fix/flows`. Hono check-types green, 82/82 tests pass; nextjs tsc has only pre-existing errors (none in use-chat.ts).

## Codebase Understanding

### Architecture Overview

- **Backend (`packages/hono`)**: Hono app. `/chat/send` uses `@ai-sdk/openai` `createOpenAI` + `generateText` against `FOUNDRY_OPENAI_URL`. The backend can NOT decrypt agent/memory blueprints (they're kWallet-encrypted, kWallet only exists in the browser) — so the frontend is the single source of decrypted context.
- **Agent blueprint** (encrypted IPFS): `{ personality, instructions, description, icon, persistentMemory }` — this is the persona source of truth. On-chain only stores name/cid/hash.
- **Memory blueprint** (encrypted IPFS): raw content string (decrypts to plain text, NOT JSON).
- **kWallet**: derived from fixed-message wallet signature, persisted per-address in localStorage (see prior handoff — MUST stay deterministic).
- **Foundry**: `gpt-5-nano` (OpenAI) + `Phi-4-mini-instruct` (Microsoft) are the two live deployments.

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `packages/hono/src/routes/chat.ts` | `/chat/send` + chat CRUD | `createChatRoutes` now takes ONLY `chatRegistry`; `/send` accepts `systemPrompt/memories/history`, builds `system`+`messages` |
| `packages/hono/src/index.ts` | App wiring | Call site updated: `createChatRoutes(chatRegistry)` |
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` | Chat state + `sendMessage` | Decrypts agent persona + linked memory contents; builds `systemPrompt/memories/history` payload |
| `packages/nextjs/services/api/ipfs.ts` | `retrieveFromIpfs` | Frontend fetches blueprints from IPFS |
| `packages/nextjs/services/crypto/envelope.ts` + `utils.ts` | `decryptWalletEnvelope`, `decryptData`, `base64ToArrayBuffer` | Decryption primitives reused in use-chat.ts |
| `packages/nextjs/src/modules/chat/types/chat.ts` | `ChatMessage`, `AgentBlueprint` | Type for chat state (unchanged this session) |

### Key Patterns Discovered

- **Frontend decrypts, backend relays**: because kWallet only exists client-side, all persona/memory decryption happens in the browser; the backend must never try to read blueprint contents.
- **`ai` SDK v7**: `generateText({ model, system, messages, allowSystemInMessages, maxOutputTokens })`. A `system`-role message inside `messages` REQUIRES `allowSystemInMessages: true`, otherwise it throws `InvalidPromptError` ("System messages are not allowed... Use the instructions option instead").
- **Memory vs agent blueprint shape differs**: agent blueprints decrypt to a JSON object; memory blueprints decrypt to a plain string. Two separate helpers in use-chat.ts (`fetchDecryptedAgentBlueprint`, `fetchDecryptedMemoryContent`).
- **Dev-mode guard**: blueprints have `dev-` prefixed fake cids when kWallet is absent — skip decryption when `cid.startsWith("dev-")` or `!session.kWallet`.
- **Welcome message excluded from history**: UI welcome placeholder has id `"welcome"` — filtered out of the history payload so the model doesn't see canned UI text.

## Work Completed

### Tasks Finished

- [x] Interview-me alignment: confirmed 7 design decisions (frontend decrypts/sends, memories = first context message, persona = system prompt, branding vs capability-pitch boundary, neutral fallback, welcome excluded from history, remove backend chain lookups)
- [x] Rewrote `/chat/send` to accept `{ systemPrompt, memories[], history[], message, chatId, model }` and removed all `agentRegistry`/`memoryRegistry`/`contextRegistry` lookups
- [x] `createChatRoutes` signature slimmed to `(chatRegistry)`; updated `index.ts` call site
- [x] `/chat/send` builds `system` (persona or neutral fallback `"Eres un asistente útil. Responde en español."`), injects memories as a leading `system`-role context message with `allowSystemInMessages: true`, then history + new user message
- [x] Frontend `sendMessage` decrypts the selected agent's blueprint → `systemPrompt` = MemoryChain branding + `Eres {name}. {personality}\n{instructions}` (neutral fallback when persona empty, rebuilt on every agent change)
- [x] Frontend `loadLinkedMemories`/`linkMemory` decrypt each linked memory's content and carry it in `LinkedMemory.content`
- [x] Frontend sends `memories` (only ones with decrypted content) + `history` (prior user/assistant messages, excluding `welcome`)

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `packages/hono/src/routes/chat.ts` | Removed agent/memory/context chain lookups from `/send`; new schema (systemPrompt/memories/history); build `messages` array; `allowSystemInMessages: true`; signature → `createChatRoutes(chatRegistry)` | Backend can't decrypt blueprints; frontend now sends decrypted context; model is a plain chatbot |
| `packages/hono/src/index.ts` | `createChatRoutes(chatRegistry)` | Match new signature |
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` | Added `fetchDecryptedAgentBlueprint`/`fetchDecryptedMemoryContent`/`buildSystemPrompt` helpers; `loadLinkedMemories`+`linkMemory` decrypt content; `sendMessage` sends `systemPrompt/memories/history` | Persona + linked-memory contents only reachable client-side |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Frontend decrypts blueprint → sends `systemPrompt`/`memories`/`history` to backend | Backend fetches chain metadata; backend tries to decrypt | kWallet only exists in browser; chain metadata is useless (empty descriptions) |
| Memories = leading `system`-role context message, NOT in system prompt | Put memories in system prompt; separate field | User preferred first-message; system prompt stays purely the agent persona; `allowSystemInMessages: true` needed |
| System prompt = branding + `Eres {name}. {personality}\n{instructions}` | Plain persona only; no branding | User wants general "MemoryChain AI agent" branding for marketing, but NO "I can create/manage agents/memories" capability pitch |
| Neutral fallback when no/empty persona: `"Eres un asistente útil. Responde en español."` | Empty system field | Model never gets an empty/undefined system; keeps it a plain chatbot |
| Welcome placeholder excluded from history | Include it | It's canned UI text ("Soy tu asistente de MemoryChain…"), not a real model reply |
| Removed chain lookups entirely (no fallback to on-chain metadata) | Keep chain fetch as fallback | Backend is now a thin relay; chain has no content worth sending |

## Pending Work

### Immediate Next Steps

1. **Verify end-to-end in the browser**: log in, create/select an agent with personality+instructions, link a memory, send a message, and confirm (a) the reply reflects the agent persona + linked memory contents, (b) the model does NOT claim it can create/manage agents/memories. Services must be running (see Environment State).
2. **Restart servers** to pick up changes (Hono :3001, Next.js :3000) before testing — `/chat/send` and `use-chat.ts` were edited.
3. **Commit the working tree** on `fix/flows` (3 modified files + this handoff).
4. Consider removing the now-unused `agentRegistry`/`memoryRegistry`/`contextRegistry` params from `createChatRoutes`'s callers elsewhere if any exist (grep for `createChatRoutes`).

### Blockers/Open Questions

- [ ] None known. Backend tests don't cover `/chat/send` (it calls the live provider) — no automated coverage for the new payload shape.

### Deferred Items

- Streaming chat responses (Phase 5, never implemented)
- Tool execution engine
- Storing the decrypted persona/memory contents anywhere server-side (out of scope — E2E encryption intent)
- Pre-existing `@ss/nextjs` type errors (~11: e2e page, agent-form, useSiwe grantPermissions, memories-page, memory-form, memories/index) — untouched/known

## Context for Resuming Agent

### Important Context

- **All changes are UNCOMMITTED.** Run `git status`/`git diff` before doing anything.
- **Env vars (names only)**: `FOUNDRY_OPENAI_URL`, `FOUNDRY_PROJECT_URL`, `FOUNDRY_KEY`, `FOUNDRY_API_VERSION`, `DEV_PRIVATE_KEY`, `RPC_URL`, `BUNDLER_URL`, `IPFS_API_URL`, `CORS_ORIGIN`, `ENABLE_DEV_WALLET_AUTH`, `PORT`, `REDIS_URL`. Never print `FOUNDRY_KEY`.
- **Live Foundry deployments**: `gpt-5-nano` (OpenAI) + `Phi-4-mini-instruct` (Microsoft). Only these are valid `model` values.
- **kWallet derivation must stay deterministic** (fixed-message signature) — do not revert to signing the SIWE challenge.
- **The model must NEVER be told it can create/change agents or memories.** Branding mention of MemoryChain is fine; capability pitch is not.
- **`allowSystemInMessages: true` is required** on `generateText` because memories are injected as a `system`-role message in the `messages` array.
- **Verification commands**: `pnpm --filter @ss/hono check-types`, `pnpm --filter @ss/hono test` (82/82), `pnpm --filter @ss/nextjs exec tsc --noEmit` (pre-existing errors only).
- **User session (dev)**: `0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E`, cookie `session=78bb1587c3241eb6c56f2b59da0c5236` (ephemeral).

### Assumptions Made

- Frontend is the only place kWallet exists, so it must decrypt and send persona/memory contents to the backend (confirmed with user).
- Dev-mode agents/memories (no kWallet, `dev-` cids) will just fall back to the neutral system prompt / no memory content.
- The `ai` SDK v7 `ModelMessage` type accepts `{ role: "system" | "user" | "assistant", content }`.

### Potential Gotchas

- **`ai` SDK v7**: `system`-role message in `messages` throws without `allowSystemInMessages: true`. Uses `maxOutputTokens`/`result.usage?.inputTokens` (NOT `maxTokens`/`promptTokens`).
- **Azure OpenAI auth** needs the `api-key` header (Authorization fails) — passed via `headers` in `chat.ts`.
- **Do NOT bind port during tests**: `serve()` in `index.ts` is wrapped in `if (!process.env.VITEST)`.
- **Reasoning models** (gpt-5-nano): generous `maxOutputTokens` (2000), NO `temperature`.
- **Zero hashes revert on-chain**: chat/memory/agent writes must pass real non-zero keccak hashes (prior session).
- **`_`-prefixed params** satisfy `noUnusedParameters`; keep `packages/hono/src/types/contracts.ts` signatures in sync.
- **`use-chat.ts` dep array** for `sendMessage` now includes `linkedMemories` and `session.kWallet` — don't remove them or you reintroduce stale-closure bugs.
- `packages/hono/.env` is gitignored — keep secrets out of committed files.

## Environment State

### Tools/Services Used

- Azure AI Foundry (OpenAI-compatible endpoint + deployments listing)
- Hono backend :3001, Next.js frontend :3000, IPFS :5001, Nitro DevNode :8547
- pnpm 9.15.4, Node v24.18.0

### Active Processes

- Hono dev server on :3001 (RESTART after editing `chat.ts` — new `/send` payload shape)
- Next.js dev server on :3000 (RESTART after editing `use-chat.ts`)

### Environment Variables

- `FOUNDRY_OPENAI_URL`, `FOUNDRY_PROJECT_URL`, `FOUNDRY_KEY`, `FOUNDRY_API_VERSION`
- `DEV_PRIVATE_KEY`, `RPC_URL`, `BUNDLER_URL`, `IPFS_API_URL`, `CORS_ORIGIN`, `ENABLE_DEV_WALLET_AUTH`, `PORT`, `REDIS_URL`

## Related Resources

- Previous handoff: `./2026-08-11-004741-fix-chat-models-agents-persistence.md` (kWallet determinism, zero-hash fixes, model budget)
- `packages/nextjs/FRONTEND_PLAN.md` — original crypto design (deriveKWallet fixed-message intent)
- `packages/nextjs/services/crypto/keys.ts`, `envelope.ts`, `utils.ts`, `session-storage.ts` — key derivation + envelope crypto
- `packages/nextjs/src/modules/agents/hooks/use-agent.ts` — reference for agent blueprint encrypt/decrypt shape
- `packages/nextjs/src/modules/memories/hooks/use-memory.ts` — reference for memory blueprint encrypt/decrypt shape

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
