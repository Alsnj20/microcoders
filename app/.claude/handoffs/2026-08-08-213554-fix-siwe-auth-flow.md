# Handoff: Fix SIWE Auth Flow

## Session Metadata
- Created: 2026-08-08 21:35:54
- Project: /home/cricro/store/projects/eth-lima/microcoders/app
- Branch: fix/flows
- Session duration: ~2 hours

### Recent Commits (for context)
  - 330b719 fix: cors script fixes
  - e9e8379 fix: define new contract abis
  - 0bf6f2e feat: chat registry and removal of json as storage
  - 8d6a54b fix: wasm compilation script for stale builds
  - f0da70e fix: devnode launch

## Handoff Chain

- **Continues from**: [2026-08-08-200814-chat-registry-implementation.md](./2026-08-08-200814-chat-registry-implementation.md)
  - Previous title: Chat Registry Implementation + On-Chain Names + Provider Migration
- **Supersedes**: None

## Current State Summary

The SIWE (Sign-In with Ethereum) authentication flow has been fixed and is now fully functional. Previously, the app bypassed wallet signing entirely due to two issues: (1) a dev wallet auto-session middleware that created sessions from an `X-Dev-Wallet` header without SIWE, and (2) the `OnboardingFlow` component never calling `useSiwe().login()`. Both are now gated behind explicit env vars (`ENABLE_DEV_WALLET_AUTH` / `NEXT_PUBLIC_ENABLE_DEV_WALLET_AUTH`). The session middleware now correctly reads cookies and resolves sessions from the store. MetaMask prompts now appear when dev wallet auth is disabled. Two pre-existing contract-level issues remain: `registerUser` reverts with error `0x436f6d6d`, and credits buy returns incorrect amounts.

## Codebase Understanding

### Architecture Overview

- **Frontend**: Next.js App Router with `(app)` route group wrapped in `<AuthGate>`
- **Backend**: Hono server on port 3001 with middleware chain: CORS → Dev wallet auth → Request logging → Session resolution
- **Auth flow**: SIWE challenge → wallet signature → session cookie → subsequent requests use cookie
- **Session store**: In-memory `Map` with TTL (not Redis — only session keys use Redis)
- **Wallet connectors**: RainbowKit with `rainbowkitBurnerWallet` for local dev, MetaMask/WalletConnect for real wallets
- **Contract interaction**: Stylus contracts on Arbitrum Nitro (chain 412346)

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `packages/hono/src/index.ts` | Backend middleware chain, session resolution from cookie | Core auth infrastructure |
| `packages/hono/src/routes/auth.ts` | SIWE challenge/verify endpoints, session create/read | Auth endpoints |
| `packages/nextjs/src/modules/auth/components/AuthGate.tsx` | Route protection, decides onboarding vs app | Controls auth flow |
| `packages/nextjs/src/modules/auth/components/OnboardingFlow.tsx` | Onboarding steps including SIWE | User-facing auth |
| `packages/nextjs/src/modules/auth/hooks/useSiwe.ts` | SIWE login/logout logic, session management | Auth hook |
| `packages/nextjs/services/api/client.ts` | API client with dev wallet header injection | Request layer |
| `packages/nextjs/services/web3/wagmiConnectors.tsx` | Wallet connector list, burner wallet gating | Wallet selection |
| `packages/nextjs/components/ScaffoldEthAppWithProviders.tsx` | App providers, burner wallet init | Bootstrap |

### Key Patterns Discovered

- The `burner-connector` package provides `rainbowkitBurnerWallet` that auto-signs without prompts
- `initBurnerPK()` in `burner.ts` forces the private key to `arbitrumNitro.accounts[0]` if it doesn't match pre-configured accounts
- The `useSiwe` hook is called both in `AuthGate` and `OnboardingFlow` — each has its own instance
- `signMessageAsync` from wagmi triggers MetaMask only when connected through MetaMask connector, not burner
- The session middleware must parse `Cookie` header manually — Hono doesn't do this automatically
- The `Set-Cookie` header in `/auth/verify` uses `HttpOnly` so JavaScript can't read it (by design)

## Work Completed

### Tasks Finished

- [x] Gated `X-Dev-Wallet` header bypass behind `ENABLE_DEV_WALLET_AUTH` env var
- [x] Gated client-side header injection behind `NEXT_PUBLIC_ENABLE_DEV_WALLET_AUTH`
- [x] Fixed session middleware to parse cookies and resolve sessions from store
- [x] Added SIWE step to `OnboardingFlow` (new step type `"siwe"`)
- [x] Modified `AuthGate` to require SIWE on wallet reconnection
- [x] Gated `initBurnerPK()` behind `NEXT_PUBLIC_ENABLE_DEV_WALLET_AUTH`
- [x] Gated `rainbowkitBurnerWallet` connector behind `NEXT_PUBLIC_ENABLE_DEV_WALLET_AUTH`
- [x] Added comprehensive debug logging to all auth layers
- [x] Added error logging to `POST /user/register` route

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `packages/hono/src/index.ts` | Replaced `NODE_ENV !== "production"` with `ENABLE_DEV_WALLET_AUTH === "true"`, added cookie parsing in session middleware, added debug logs | Gate dev auth behind explicit env var, fix session resolution |
| `packages/hono/src/routes/auth.ts` | Added debug logging to challenge/verify/session endpoints | Trace auth flow |
| `packages/hono/src/routes/user.ts` | Added error logging to registerUser | Debug contract errors |
| `packages/hono/.env.example` | Added `ENABLE_DEV_WALLET_AUTH` | Document new env var |
| `packages/hono/.env` | Added `ENABLE_DEV_WALLET_AUTH=true` | Enable for local dev |
| `packages/nextjs/services/api/client.ts` | Gated `X-Dev-Wallet` header behind `NEXT_PUBLIC_ENABLE_DEV_WALLET_AUTH`, added request logging | Gate dev auth, debug requests |
| `packages/nextjs/src/modules/auth/components/AuthGate.tsx` | Added `useSiwe` import, changed session sync to require `siweAuthenticated`, added render decision logging | Require SIWE before showing app |
| `packages/nextjs/src/modules/auth/components/OnboardingFlow.tsx` | Added `"siwe"` step type, added `useSiwe` import, changed flow to go through SIWE before register, added step transition logging | Add SIWE to onboarding |
| `packages/nextjs/src/modules/auth/hooks/useSiwe.ts` | Added debug logging throughout login/checkSession | Trace SIWE flow |
| `packages/nextjs/components/ScaffoldEthAppWithProviders.tsx` | Gated `initBurnerPK()` behind `NEXT_PUBLIC_ENABLE_DEV_WALLET_AUTH` | Prevent auto-loading burner wallet |
| `packages/nextjs/services/web3/wagmiConnectors.tsx` | Gated `rainbowkitBurnerWallet` inclusion behind `NEXT_PUBLIC_ENABLE_DEV_WALLET_AUTH` | Remove burner from wallet list |
| `packages/nextjs/.env.example` | Added `NEXT_PUBLIC_ENABLE_DEV_WALLET_AUTH` | Document new env var |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Use `ENABLE_DEV_WALLET_AUTH` env var to gate dev bypass | Keep `NODE_ENV` check vs explicit env var | Explicit env var is safer — won't accidentally bypass in staging/test environments |
| Add SIWE as a new onboarding step instead of modifying connect step | Modify connect step vs add new step | Cleaner separation of concerns, easier to maintain |
| Gate `rainbowkitBurnerWallet` at connector level | Remove from wallets array vs hide in UI | Prevents burner from appearing in wallet selection at all |
| Use in-memory session store for dev | Redis vs in-memory | In-memory is simpler for local dev; Redis is already used for session keys |

## Pending Work

### Immediate Next Steps

1. Fix `POST /user/register` contract revert — error `0x436f6d6d` (ASCII "Comm") from Stylus contract. Need to check contract error definitions or ABI.
2. Fix `POST /credits/buy` returning incorrect amounts (user bought 50 MC but got 450). Likely a contract-level bug.
3. Remove debug logging from production code (all `[Auth]`, `[SIWE]`, `[Onboarding]`, `[API]`, `[Middleware]` prefixed logs).

### Blockers/Open Questions

- [ ] Contract error `0x436f6d6d` on `registerUser` — need Stylus contract source to decode
- [ ] Credits buy returning wrong amounts — need to check `CreditManagerContract` logic
- [ ] `POST /chat/list` returns 500 — possibly related to unregistered user state

### Deferred Items

- Session key creation after registration (EIP-4337 style scoped permissions)
- Production session store (Redis instead of in-memory)
- Rate limiting on auth endpoints
- Session rotation/refresh mechanism

## Context for Resuming Agent

### Important Context

The auth flow now works as follows:
1. `AuthGate` checks `isConnected`, `isRegistered` (on-chain), and `siweAuthenticated` (from `useSiwe`)
2. If not connected → shows `OnboardingFlow` starting at "welcome"
3. If connected but not registered → shows `OnboardingFlow` starting at "credits"
4. If registered but not SIWE authenticated → shows `OnboardingFlow` starting at "siwe"
5. If all conditions met → shows app children

The `OnboardingFlow` steps are: welcome → credits → username → connect → siwe → registerAndComplete

The env vars control dev convenience:
- `ENABLE_DEV_WALLET_AUTH=true` (backend) + `NEXT_PUBLIC_ENABLE_DEV_WALLET_AUTH=true` (frontend) = burner wallet works, no SIWE required
- Both unset or `"false"` = real wallet required, SIWE signature required, MetaMask prompts appear

The `registerAndComplete` function does NOT check `res.ok` on the register response — it logs "Registered" even on 500 errors. This is a bug that masks contract failures.

### Assumptions Made

- The Stylus contract at `0xa39ffa43eba037d67a0f4fe91956038aba0ca386` is deployed and accessible
- The `DEV_PRIVATE_KEY` in `.env` has permission to call contract functions
- MetaMask is installed and configured in the browser
- The local dev node is running on `http://localhost:8547`

### Potential Gotchas

- The `useSiwe` hook is instantiated separately in `AuthGate` and `OnboardingFlow` — they have independent state
- `signMessageAsync` from wagmi only triggers MetaMask when connected through MetaMask connector, not burner
- The session cookie is `HttpOnly` — cannot be read by JavaScript (this is correct behavior)
- `registerAndComplete` doesn't check `res.ok` — will log "Registered" even on contract errors
- The `rainbowkitBurnerWallet` connector auto-signs without any user interaction
- `initBurnerPK()` forces the private key to `arbitrumNitro.accounts[0]` if it doesn't match pre-configured accounts

## Environment State

### Tools/Services Used

- Next.js (frontend)
- Hono (backend API)
- RainbowKit + wagmi (wallet connection)
- viem (Ethereum interactions)
- Stylus contracts on Arbitrum Nitro (chain 412346)
- MetaMask browser extension

### Active Processes

- Next.js dev server on port 3000
- Hono backend on port 3001
- Local Arbitrum Nitro dev node on port 8547

### Environment Variables

Backend (`packages/hono/.env`):
- `ENABLE_DEV_WALLET_AUTH` — Gates dev wallet auto-session bypass
- `DEV_PRIVATE_KEY` — Server-side private key for contract interactions
- `RPC_URL` — RPC URL for Nitro DevNode
- `CORS_ORIGIN` — CORS origin (http://localhost:3000)
- `PORT` — Server port (3001)
- `IPFS_API_URL` — IPFS API URL

Frontend (`packages/nextjs/.env.local`):
- `NEXT_PUBLIC_ENABLE_DEV_WALLET_AUTH` — Gates client-side dev wallet header and burner wallet
- `NEXT_PUBLIC_API_URL` — Backend API URL (http://localhost:3001)

## Related Resources

- `packages/hono/src/routes/auth.ts` — SIWE challenge/verify/session endpoints
- `packages/nextjs/src/modules/auth/hooks/useSiwe.ts` — SIWE login/logout hook
- `packages/nextjs/src/modules/auth/components/ConnectWallet.tsx` — Standalone SIWE component (NOT used in onboarding)
- `packages/nextjs/utils/scaffold-stylus/burner.ts` — Burner wallet utilities
- `packages/nextjs/utils/scaffold-stylus/supportedChains.ts` — Hardcoded dev account private keys
- `packages/hono/src/types/session.ts` — Session types and store interface

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
