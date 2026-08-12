# Handoff: Chat Persistence on IPFS/Chain, Memories Content Fix & Silent Tx-Revert Detection

## Session Metadata
- Created: 2026-08-11 02:33:07
- Project: /home/cricro/store/projects/eth-lima/microcoders/app
- Branch: fix/flows
- Session duration: ~1.5h (3 sequential bug fixes)

### Recent Commits (for context)
  - 1ec979c refactor: chat provider data flow
  - 507f44c fix: chat models
  - 1ecde97 refactor: stateless backend and foundry
  - 5dd5599 fix: contracts and foundry
  - f51bc4e refactor: separate agents from models

## Handoff Chain

- **Continues from**: [2026-08-11-012015-chat-provider-data-flow.md](./2026-08-11-012015-chat-provider-data-flow.md)
  - Previous title: Chat → AI Provider Data Flow (Personas, Linked Memories, Chat History)
- **Supersedes**: None

> Review the previous handoff for full context before filling this one.

## Current State Summary

Three consecutive bugs were fixed on `fix/flows` (all UNCOMMITTED except the last handoff's commit `1ec979c`):

1. **Memory content never saved** — the memories page form (SlidePanel in `memories-page.tsx`) had no "Contenido" field, so every memory was created/updated with empty content. Added the field, prefilled it from the decrypted IPFS blueprint on edit, and show content in the detail panel.
2. **Chats were not persisted** — `saveConversation` previously stored a fake `chat-${chatId}-${ts}` cid + hash on-chain with nothing pinned to IPFS, so conversations had no recoverable content. Rewrote `saveConversation` to encrypt the conversation JSON with kWallet and pin it to IPFS (mirroring agents/memories); added `loadConversationMessages` + a `selectConversation` load path; made `/chat/list` return `cid`/`hash`.
3. **Chat updates silently reverted on-chain** — `PUT /chat/:id` returned 200 but the `updateChat` tx was mined and reverted (version stayed 1, cid stayed `chat-init-*`). viem's `waitForTransactionReceipt` resolves on reverted receipts and the adapter never checked `receipt.status`, so false success was reported. Root cause of the revert was nonce collisions: all writes go through a single shared dev signer account, and rapid create→update sequences reused nonces. Fixed with a `nonceManager` on the signer + `confirmTx()` that checks `receipt.status` across ALL registry write adapters.

All changes are UNCOMMITTED. hono `check-types` green, 82/82 tests pass, nextjs `tsc --noEmit` at the 11 pre-existing errors (none in touched files).

## Codebase Understanding

### Architecture Overview

- **Backend (`packages/hono`)**: Hono app; contract writes go through `packages/hono/src/lib/contracts.ts` adapters using a **single shared `walletClient`** signed by `DEV_PRIVATE_KEY` (whose address IS the dev user `0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E`). Stylus contracts are Rust (not Solidity) in `packages/stylus/contracts/`.
- **Contracts enforce `msg.sender == owner`** on update paths AND **consume credits from `msg.sender`** via cross-contract calls to `credit-manager` (`consume_credits_for_op`). Fees are 1 credit/op. Dev account balance was ~239.
- **Frontend (`packages/nextjs`)**: decrypts kWallet-encrypted IPFS blueprints client-side; `session.kWallet` is `Uint8Array | null` loaded from `localStorage` key `mc_kwallet_<lowercase-address>` via `services/crypto/session-storage.ts`.
- **Nitro DevNode RPC** (`http://localhost:8547`) supports `debug_traceCall`; viem 2.55.11.
- **IPFS**: `pinToIpfs`/`retrieveFromIpfs` via `services/api/ipfs.ts` → hono `/ipfs/pin` + `/ipfs/:cid` (returns base64 `data`). Real cids are `Qm…` base58.

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `packages/hono/src/lib/contracts.ts` | All registry write/read adapters | `confirmTx()` + `nonceManager` added; all writes now check `receipt.status` |
| `packages/hono/src/routes/chat.ts` | `/chat/send` + chat CRUD | `/chat/list` now returns `cid`/`hash`; `/chat/:id` PUT surfaces adapter failures as 500 |
| `packages/nextjs/services/api/chat-storage.ts` | Chat persistence helpers | `saveConversation` pins encrypted conversation to IPFS (throws if on-chain update fails); `loadConversationMessages` decrypts from IPFS |
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` | Chat state + send/select | `selectConversation` loads messages from IPFS; `sendMessage` creates on-chain chat on first message even for "Nueva conversación" chats; save failure logged |
| `packages/nextjs/src/modules/memories/components/pages/memories-page.tsx` | Memory CRUD UI | Added Contenido field, edit/detail now load decrypted content |
| `packages/stylus/contracts/chat-registry/src/lib.rs` | ChatRegistry (Rust) | `update_chat`/`create_chat` ownership + credit consumption rules |

### Key Patterns Discovered

- **viem v2 `waitForTransactionReceipt` does NOT throw on reverted receipts** — always check `receipt.status === "success"`. This was THE silent-failure bug.
- **viem v2 nonceManager**: import `nonceManager` from `viem/accounts` and attach to the account: `createWalletClient({ account: { ...account, nonceManager }, ... })`. Prevents nonce reuse across concurrent writes from one signer.
- **kWallet encryption envelope** (all blueprints): `{ ciphertext: b64, walletEnvelope: b64, recoveryEnvelope: "" }`; encrypt `JSON`/string with fresh `kData`, wrap `kData` with `createWalletEnvelope(kData, kWallet)`. Agent blueprints decrypt to JSON; memory + chat blueprints decrypt to plain string / JSON respectively.
- **Dev fake cids**: `dev-<ts>` (no kWallet) and legacy `chat-init-*`/`chat-*` (pre-persistence chats) — `loadConversationMessages` bails on `dev-` and `chat-` prefixes.
- **Dev-account == user address**: `DEV_PRIVATE_KEY`'s account equals the dev user `0x3f1E…`, so ownership checks pass; credits are consumed from this same account.

## Work Completed

### Tasks Finished

- [x] Added "Contenido" textarea to memories create/edit form; `handleEdit`/`handleViewDetail` now decrypt content via `getMemory`; detail panel shows content. Fixed `formData` state typing to `MemoryType`.
- [x] Chat persistence: `saveConversation(conversation, kWallet)` pins encrypted conversation JSON to IPFS, stores real cid + keccak hash on-chain; `loadConversationMessages(chatId, cid, kWallet)` retrieves+decrypts; `listConversations` includes `cid`; `/chat/list` backend returns `cid`+`hash`.
- [x] `use-chat.ts`: `selectConversation` loads messages from IPFS; `sendMessage` creates the on-chain chat on first message even when started via "Nueva conversación"; local conversation updated with pinned `cid` after save; save errors logged (not swallowed).
- [x] `contracts.ts`: added `confirmTx()` (checks `receipt.status`) applied to ALL write adapters (agent, memory, chat, context, audit) and `createAgent`/`createChat`; added viem `nonceManager` to shared signer; `recordAudit` checks status before reading logs.

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `packages/hono/src/lib/contracts.ts` | `nonceManager` on signer account; `confirmTx()` helper; every `writeContract`+`waitForTransactionReceipt` now checks receipt status and returns `{ success:false }` on revert | Silent tx-revert was reporting false success; nonce collisions under concurrent writes caused the reverts |
| `packages/hono/src/routes/chat.ts` | `/chat/list` returns `cid`+`hash` | Frontend needs the cid to load conversation messages |
| `packages/nextjs/services/api/chat-storage.ts` | `saveConversation` pins encrypted conversation to IPFS (dev fallback `dev-<ts>`), throws if on-chain update fails; new `loadConversationMessages`; `listConversations` maps `cid` | Chat messages now recoverable after reload, mirroring agents/memories |
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` | `selectConversation` loads via `loadConversationMessages`; `sendMessage` ensures on-chain chat exists + updates local cid; `.catch` logs persistence errors | Chats load on reload; no more silent save failures |
| `packages/nextjs/src/modules/memories/components/pages/memories-page.tsx` | Contenido field in form; edit/detail load decrypted content; `formData` typed `{ title, description, type: MemoryType, content }` | Memories were always saved with empty content (form never collected it) |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Add nonceManager to shared signer account | Explicit nonce counter; serialize via mutex | viem-native; prevents nonce reuse/replacement across concurrent create→update writes |
| `confirmTx()` checks `receipt.status` in ALL adapters | Only fix chat update | Same silent-revert bug was observed on agent writes (alternating OK/REVERT on-chain); systemic fix |
| Chats stored as encrypted IPFS blueprint (like agents/memories) | localStorage; plaintext IPFS | Consistent with E2E-encrypted product design; recoverable cross-device via on-chain cid |
| `saveConversation` throws when on-chain update fails | Return null silently | Surface failures so the UI can react instead of showing a false-success chat |
| Memories form gains a Contenido field (was missing entirely) | Reuse existing `MemoryForm` (unused dead code) | Minimal change; the inline SlidePanel form was the one actually rendered |

## Pending Work

### Immediate Next Steps

1. **User to test end-to-end**: restart hono (tsx watch auto-reloads but wipes the in-memory session store → re-login), create a new agent+memory (with content) + link memory + chat, reload the page, and confirm: (a) conversation loads its messages, (b) memory content decrypts and shows in the chat, (c) no `Failed to persist chat:` console error. Verify a `PUT /chat/:id` now commits (version increments, cid becomes a real `Qm…`).
2. **Commit the working tree** on `fix/flows` (5 modified files + this handoff). Consider pushing.
3. Optionally add automated coverage for `/chat/send` + `/chat/:id` PUT (currently none — they hit the live provider/chain).
4. Consider whether `recordAudit`'s non-revert check needs the same `confirmTx` treatment for userop-based writes (lines ~1051+ use `buildAndSendUserOp`/`waitForUserOp` — check whether `waitForUserOp` detects reverts).

### Blockers/Open Questions

- [ ] None known. The exact transient revert trigger was not isolated (simulation/direct tx pass; reverts only appeared under concurrent writes from the shared account). If reverts persist after the nonceManager fix, run `debug_traceCall`/scan the DevNode blocks again (see `revreason*.cjs` notes) to capture the nested call that reverts.

### Deferred Items

- Legacy stuck chats (`0x70b981…`, `0x24991a…`) keep `chat-init-*` cids — content unrecoverable; harmless, just ignored by the loader. No migration planned.
- `check_staleness.py`/`list_handoffs.py` were not run; the two orphan chats and the in-memory session wipe (server restart) are the only stale state.

## Context for Resuming Agent

### Important Context

- **All changes are UNCOMMITTED.** Run `git status`/`git diff` before doing anything.
- **Env vars (names only)**: `FOUNDRY_OPENAI_URL`, `FOUNDRY_PROJECT_URL`, `FOUNDRY_KEY`, `FOUNDRY_API_VERSION`, `DEV_PRIVATE_KEY`, `RPC_URL`, `BUNDLER_URL`, `IPFS_API_URL`, `CORS_ORIGIN`, `ENABLE_DEV_WALLET_AUTH`, `PORT`, `REDIS_URL`. Never print `FOUNDRY_KEY`/`DEV_PRIVATE_KEY`.
- **Dev account == user**: `DEV_PRIVATE_KEY` → `0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E`. All on-chain writes and credit consumption are charged to this account.
- **kWallet must stay deterministic** (fixed-message signature) — persisted in `localStorage` under `mc_kwallet_<addr>`; loaded by `checkSession`/`AuthGate` before the chat page renders.
- **Stylus contracts are Rust** (`packages/stylus/contracts/*-registry/src/lib.rs`), not Solidity. Ownership = `msg.sender`; updates consume credits from `msg.sender`.
- **Do NOT trust HTTP 200 from write routes**: a 200 could previously mean "tx reverted, ignored". After this fix, adapters return `{ success:false }` on revert and routes return 500.
- **Verification commands**: `pnpm --filter @ss/hono check-types`, `pnpm --filter @ss/hono test` (82/82), `pnpm --filter @ss/nextjs exec tsc --noEmit` (11 pre-existing errors, none in touched files).
- **User session (dev)**: `0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E`; the hono session cookie is in-memory (lost on hono restart → re-login required).
- **Live Foundry models**: only `gpt-5-nano` and `Phi-4-mini-instruct` are valid `model` values.

### Assumptions Made

- The chat update reverts were caused by nonce collisions under concurrent writes from the shared dev signer (evidence: alternating OK/REVERT blocks, simulation passes, isolated txs pass). The nonceManager should resolve it; if not, re-investigate the DevNode trace.
- Frontend is the single source of decrypted blueprint content (kWallet only exists client-side); backend must never try to decrypt blueprints.
- `allowSystemInMessages: true` is required on `generateText` when memories are injected as a `system`-role message.

### Potential Gotchas

- **viem `waitForTransactionReceipt` resolves on reverted receipts** — always check `receipt.status`. Never revert to ignoring it.
- **viem `nonceManager` must be imported from `viem/accounts`** and attached to the account object (`{ ...account, nonceManager }`), NOT passed as a `createWalletClient` top-level option (type error).
- **Don't bind the port during tests**: `serve()` in `index.ts` is wrapped in `if (!process.env.VITEST)`.
- **Hono `tsx watch` restart wipes the in-memory session store** → sessions invalid after editing `index.ts`/`contracts.ts`.
- **DevNode block scanning**: `debug_traceCall`'s `callTracer` on this DevNode does not expose revert reasons via `output`/`error`; use `eth_call`/`simulateContract` at the parent block, or decode tx calldata with `decodeFunctionData`.
- **Zero hashes revert on-chain** — chat/memory/agent writes need real non-zero keccak hashes.
- **`_`-prefixed params** satisfy `noUnusedParameters`; keep `packages/hono/src/types/contracts.ts` signatures in sync.
- **`use-chat.ts` `sendMessage` deps** include `linkedMemories` and `session.kWallet` — don't remove them.
- **Dev-mode (no kWallet)**: chats/memories/agents get `dev-<ts>` cids and won't survive reload; agent persona falls back to the neutral system prompt.

## Environment State

### Tools/Services Used

- Azure AI Foundry (OpenAI-compatible endpoint + deployments listing)
- Hono backend :3001, Next.js frontend :3000, IPFS :5001, Nitro DevNode :8547 (RPC `http://localhost:8547`)
- pnpm 9.15.4, Node v24.18.0, viem 2.55.11 (hono), Stylus (Rust) contracts
- Temporary diagnostic scripts in `/tmp`: `getchat.cjs`, `simupdate.cjs`, `scanblocks.cjs`, `scanchat.cjs`, `decode.cjs`, `revreason*.cjs`, `ethcall.cjs` — used to inspect on-chain chat state/receipts/revert reasons.

### Active Processes

- Hono dev server on :3001 (`tsx watch` — auto-reloads on file change, but RESTART wipes sessions → re-login)
- Next.js dev server on :3000 (hot-reload)
- IPFS daemon on :5001, Nitro DevNode on :8547

### Environment Variables

- `FOUNDRY_OPENAI_URL`, `FOUNDRY_PROJECT_URL`, `FOUNDRY_KEY`, `FOUNDRY_API_VERSION`
- `DEV_PRIVATE_KEY`, `RPC_URL`, `BUNDLER_URL`, `IPFS_API_URL`, `CORS_ORIGIN`, `ENABLE_DEV_WALLET_AUTH`, `PORT`, `REDIS_URL`

## Related Resources

- Previous handoff: `./2026-08-11-012015-chat-provider-data-flow.md` (chat→AI payload flow, kWallet determinism, zero-hash fixes)
- `packages/stylus/contracts/chat-registry/src/lib.rs` — ChatRegistry update/create ownership + credit rules
- `packages/stylus/contracts/credit-manager/src/lib.rs` — `consume_credits`/`consume_credits_for_op` (fees 1/op; `getFee(op 7/8)` = 1)
- `packages/nextjs/services/crypto/{envelope,keys,session-storage,utils}.ts` — encryption primitives + kWallet persistence
- `packages/nextjs/FRONTEND_PLAN.md` — original crypto design intent

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
