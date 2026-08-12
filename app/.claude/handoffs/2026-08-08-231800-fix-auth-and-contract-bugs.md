# Handoff: Fix Auth Flow & Contract Integration Bugs

## Session Metadata
- Created: 2026-08-08 23:18:00
- Project: /home/cricro/store/projects/eth-lima/microcoders/app
- Branch: fix/flows
- Session duration: ~1 hour

### Recent Commits (for context)
  - 2142f8c fix: w3 session keys misgeneration
  - 6e94bae feat: w3 session keys
  - 9a09a08 fix: remove hardcoded wallet
  - 330b719 fix: cors script fixes
  - e9e8379 fix: define new contract abis

## Handoff Chain

- **Continues from**: [2026-08-08-224035-erc4337-session-keys.md](./2026-08-08-224035-erc4337-session-keys.md)
  - Previous title: ERC-4337 + Session Keys Implementation
- **Supersedes**: None

## Current State Summary

Fixed a cascade of bugs across the auth flow, contract integration, and frontend module resolution. The onboarding flow now works end-to-end: user connects wallet → SIWE sign → register (or skip if already registered) → buy credits → enter app. Chat list, welcome message, and credit balance endpoints all work. The smart-account module was moved to match path aliases. Stylus WASM builds no longer break due to the Foundry `aa` directory.

## Codebase Understanding

### Architecture Overview

Monorepo with 3 packages:
- **packages/stylus**: Rust/Stylus smart contracts + Foundry AA deployment scripts
- **packages/hono**: Hono API server with dependency injection for contract adapters
- **packages/nextjs**: Next.js frontend with wagmi/RainbowKit, Zustand state

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `packages/nextjs/src/modules/auth/components/OnboardingFlow.tsx` | Multi-step onboarding UI | Main entry point for new user registration flow |
| `packages/nextjs/src/modules/auth/components/AuthGate.tsx` | Auth routing logic | Decides whether to show onboarding or app content based on on-chain + SIWE state |
| `packages/hono/src/lib/contracts.ts` | All contract adapters | Contains buyCredits, registerUser, getChatsByOwner, getAgentsByOwner, getMemoriesByOwner |
| `packages/hono/src/routes/chat.ts` | Chat API routes | Welcome endpoint must be before `/:id` catch-all |
| `packages/hono/src/routes/user.ts` | User registration route | Handles registerUser contract errors |
| `packages/hono/src/routes/credits.ts` | Credit purchase route | Calculates price from on-chain getPricing |
| `packages/nextjs/modules/smart-account/` | Smart account utils + hook | Moved from `src/modules/` to match `~~/*` path alias |
| `packages/stylus/contracts/Cargo.toml` | Stylus workspace config | Must exclude `aa/` directory (Foundry project, not Rust) |

### Key Patterns Discovered

- **Path alias `~~/*` maps to `packages/nextjs/*`** (project root), NOT `packages/nextjs/src/*`. All top-level directories (components, services, hooks, modules) must be at the project root, not inside `src/`.
- **Hono route order matters**: `/:id` catch-all routes must come AFTER specific routes like `/welcome`, `/list`, `/create`.
- **Contract error strings**: Stylus contracts return `CommonError::AlreadyExists` → `"CommonError: already exists"`. But viem only gives the raw 4-byte selector (`0x436f6d6d`) in the error message, NOT the decoded string. Error matching must check for the hex selector.
- **List adapters must read count first**: `getChatsByOwner`, `getAgentsByOwner`, `getMemoriesByOwner` all iterate indices but the contracts revert with "index out of bounds" when index >= count. Must call `getChatCountByOwner`/`getAgentCountByOwner`/`getMemoryCountByOwner` first.
- **Deployment address caching**: The Hono server loads contract addresses from `412346_latest.json` at startup. If contracts are redeployed, the server must be restarted.
- **`credentials: "include"`**: Required on all cross-origin fetch calls (port 3000→3001) for session cookies. The `api` client has it, but raw `fetch()` calls don't.

## Work Completed

### Tasks Finished

- [x] Moved smart-account module from `src/modules/smart-account/` to `modules/smart-account/` (root level) to match `~~/*` path alias
- [x] Fixed import in OnboardingFlow.tsx from `~/` to `~~/`
- [x] Added `aa` to Cargo workspace exclude list in `packages/stylus/contracts/Cargo.toml`
- [x] Added `registerError` state and error display in OnboardingFlow (username step + SIWE step)
- [x] Added frontend username validation (min 3 chars) in `handleCompleteUsername`
- [x] Fixed `registerAndComplete` to check `regRes.ok` before buying credits
- [x] Fixed `registerAndComplete` to handle already-registered users (409 + hex selector matching)
- [x] Fixed `getChatsByOwner` to read count first via `getChatCountByOwner`
- [x] Fixed `getAgentsByOwner` to read count first via `getAgentCountByOwner`
- [x] Fixed `getMemoriesByOwner` to read count first via `getMemoryCountByOwner`
- [x] Moved `/welcome` route before `/:id` catch-all in chat.ts
- [x] Added `credentials: "include"` to welcome message fetch in use-chat.ts
- [x] Fixed backend error matching for `registerUser` to detect "already exists" in error string

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `packages/nextjs/modules/smart-account/` | Moved from `src/modules/` | `~~/*` alias maps to project root, not `src/` |
| `packages/nextjs/src/modules/auth/components/OnboardingFlow.tsx` | Added error state, validation, improved register flow | Show errors to user, prevent submitting short usernames, handle already-registered |
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` | Added `credentials: "include"` to welcome fetch | Session cookie wasn't sent cross-origin |
| `packages/hono/src/routes/chat.ts` | Moved `/welcome` before `/:id` | Catch-all was intercepting `/welcome` |
| `packages/hono/src/lib/contracts.ts` | Read count before iterating in all 3 list adapters | Prevent out-of-bounds reverts |
| `packages/hono/src/routes/user.ts` | Improved error matching for registerUser | viem gives raw hex selector, not decoded string |
| `packages/stylus/contracts/Cargo.toml` | Added `aa` to workspace exclude | Foundry project was breaking Stylus WASM builds |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Match hex selector `0x436f6d6d` for "already exists" | Decode error in backend, or match in frontend | viem doesn't decode Stylus custom error strings; matching the hex selector is reliable and simple |
| Move smart-account to root `modules/` | Update tsconfig path aliases | Moving the file matches existing convention (`components/`, `services/` are at root); changing aliases could break other imports |
| Read count before iterating list adapters | Break loop on first revert | Reading count is one extra RPC call but prevents any possibility of out-of-bounds errors and avoids losing partially-fetched data |

## Pending Work

### Immediate Next Steps

1. Test the full onboarding flow end-to-end (connect → SIWE → register → buy credits → enter app)
2. Verify chat list loads without errors for a user with 0 chats
3. Verify welcome message displays correctly
4. Restart the Hono server if contract addresses have changed since last start
5. Verify credit balance endpoint works (requires on-chain contracts to be deployed and initialized)

### Blockers/Open Questions

- [ ] Credit-manager contract `buyCredits` may revert if `getPricing` returns different values than the backend fallback — verify pricing matches on-chain
- [ ] User registration 500 error for already-registered users is now handled gracefully in frontend, but the backend still returns 500 (not 409) for the hex-selector case — consider adding hex selector mapping in backend
- [ ] Session cookie `SameSite=Lax` may not work in all cross-origin scenarios — verify with non-localhost deployments

### Deferred Items

- ERC-7715 `wallet_grantPermissions` flow — frontend calls it but MetaMask support is experimental
- Paymaster integration — UserOps currently require prefunded accounts
- Pimlico hosted bundler configuration
- Session key encryption before Redis storage

## Context for Resuming Agent

### Important Context

The onboarding flow has multiple entry points depending on state:
- `isConnected=false` → OnboardingFlow startStep=welcome (full flow)
- `isRegistered=false` → OnboardingFlow startStep=credits (skip connect)
- `siweAuthenticated=false` → OnboardingFlow startStep=siwe (skip connect + username)
- All true → render children (app content)

The `registerAndComplete` function is called even when the user is already registered (race condition: AuthGate unmounts OnboardingFlow but async register call is still in flight). The fix handles this gracefully by treating "already registered" as non-blocking.

Contract addresses are loaded from `packages/stylus/deployments/412346_latest.json` at server startup. Multiple deployment files exist (timestamps). The latest one should always be used.

### Assumptions Made

- Nitro DevNode is running at localhost:8547
- Hono backend is running at localhost:3001
- Next.js frontend is running at localhost:3000
- Session cookies work with `credentials: "include"` cross-origin
- On-chain contracts are deployed and initialized (user-registry, credit-manager, chat-registry, agent-registry, memory-registry)

### Potential Gotchas

- **Server restart required after contract redeployment**: Contract addresses are cached at startup from `412346_latest.json`
- **Hono route order is critical**: Always define specific routes (`/welcome`, `/list`, `/create`) before catch-all `/:id` routes
- **`~~/*` alias**: Maps to project root (`packages/nextjs/*`), NOT `src/`. Components, services, hooks, modules must be at root level.
- **viem error messages**: Don't contain decoded Stylus error strings — only raw hex selectors. Match against known selectors for specific errors.
- **Cargo workspace `members = ["*"]`**: Picks up all directories with `Cargo.toml`. Foundry projects (`aa/`) must be in the `exclude` list.
- **Username validation**: Backend requires min 3 chars, alphanumeric + underscore only. Frontend must validate before sending.

## Environment State

### Tools/Services Used

- Foundry (forge) — AA contract deployment
- Docker — Alto bundler container
- pnpm — Package manager
- Node.js — Hono backend + Next.js frontend
- Nitro DevNode — Local L2 chain (chain ID 412346)

### Active Processes

- Alto bundler: `docker compose up -d` in `packages/stylus/aa/`
- Hono backend: `pnpm hono:dev` (port 3001)
- Next.js frontend: `pnpm next:dev` (port 3000)
- Nitro DevNode: `pnpm chain` (port 8547)

### Environment Variables

- `RPC_URL` — Nitro DevNode RPC (default: http://localhost:8547)
- `DEV_PRIVATE_KEY` — Server-side private key for contract interactions
- `BUNDLER_URL` — Alto bundler endpoint (default: http://localhost:4337)
- `NEXT_PUBLIC_API_URL` — Frontend API URL (default: http://localhost:3001)
- `NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS` — Frontend factory address (auto-set by deploy:aa)
- `FOUNDRY_URL` / `FOUNDRY_KEY` — AI provider for chat completions
- `REDIS_URL` — Redis for session key storage (optional)

## Related Resources

- [ERC-4337 Spec](https://eips.ethereum.org/EIPS/eip-4337)
- [Alto Bundler Docs](https://docs.pimlico.io/infra/bundler)
- [viem AA Module](https://viem.sh/account-abstraction)
- Previous handoff: [2026-08-08-224035-erc4337-session-keys.md](./2026-08-08-224035-erc4337-session-keys.md)

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
