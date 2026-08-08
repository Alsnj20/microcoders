# Handoff: MemoryChain Backend — TDD Implementation

## Session Metadata
- Created: 2026-08-07 20:46:06
- Project: /home/cricro/store/projects/eth-lima/microcoders/app
- Branch: feat/backend
- Session duration: ~2 hours

### Recent Commits (for context)
  - d2393a1 Merge branch 'main' into feat/backend
  - 56c7992 fea: unify app layout and shared chat components
  - f28b980 Merge branch 'main' into feat/backend
  - e6b6def feat: add agents and memory page
  - 34f0d33 feat: refresh landing page with pet-themed hero and features

## Handoff Chain

- **Continues from**: None (fresh start)
- **Supersedes**: None

> This is the first handoff for this task.

## Current State Summary

The MemoryChain backend (`packages/hono`) has been fully scaffolded and implemented using TDD (test-driven development). 92 tests pass across 10 test suites covering all core API routes. The backend is a Hono HTTP server with dependency injection for all external services (IPFS, smart contracts, Redis, session stores). All contract interactions are mocked via interfaces — ready to swap in real Viem clients when connecting to on-chain. Docker Compose runs Kubo IPFS (port 5001) and Redis (port 6379) locally.

## Codebase Understanding

### Architecture Overview

```
packages/hono/src/
├── index.ts                    # Hono app entry, DI container, all route mounting
├── lib/
│   ├── ipfs.ts                 # IPFS client (kubo-rpc-client) — pin, retrieve, unpin
│   └── session-keys.ts         # Redis-backed session key store implementation
├── routes/
│   ├── ipfs.ts                 # POST /ipfs/pin, GET /ipfs/:cid, DELETE /ipfs/:cid
│   ├── memories.ts             # CRUD: create, list, get, update, archive, restore
│   ├── agents.ts               # CRUD: create, list, get, update, archive, restore
│   ├── context.ts              # link, unlink, priority, disable, enable, list by agent
│   ├── chats.ts                # CRUD: create, list, get, update, archive, restore
│   ├── credits.ts              # balance, fees, pricing, AI fees
│   ├── user.ts                 # me, register, update username
│   ├── auth.ts                 # SIWE challenge/verify, session CRUD
│   └── session-keys.ts         # create, list, get, revoke, validate
├── types/
│   ├── contracts.ts            # 6 contract interfaces (mock boundaries)
│   └── session.ts              # Session + session key types
└── __tests__/ (92 tests)
```

**Key architectural pattern**: Dependency injection. `createApp(deps)` accepts optional dependencies (IPFS client, contract mocks, session store, session key store). Tests inject mocks; production swaps in real implementations. No global singletons.

**Data flow**: Frontend encrypts data client-side → sends ciphertext to backend → backend pins to IPFS → backend calls on-chain contract with CID → on-chain stores minimal metadata (ID + name + CID). Decryption never happens on the backend.

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `packages/hono/src/index.ts` | App entry, DI container, route mounting | Central wiring — add new deps/routes here |
| `packages/hono/src/types/contracts.ts` | 6 contract interfaces (Memory, Agent, Context, Chat, Credit, User) | Mock boundaries — swap for real Viem clients |
| `packages/hono/src/types/session.ts` | Session + session key types | Defines SessionStore and SessionKeyStore interfaces |
| `packages/hono/src/lib/ipfs.ts` | IPFS client (kubo-rpc-client) | Pin/retrieve/unpin encrypted data |
| `packages/hono/src/lib/session-keys.ts` | Redis-backed session key store | Real Redis implementation for production |
| `packages/hono/src/routes/auth.ts` | SIWE challenge/verify | Session creation via SIWE signatures |
| `packages/hono/src/routes/session-keys.ts` | Session key CRUD + validation | ERC-7715 session key management |
| `docker-compose.yml` | IPFS + Redis containers | Required for local development |
| `packages/hono/API_SCHEMA.md` | Full API schema (46 endpoints) | Reference for all req/res shapes |
| `packages/hono/BACKEND_PLAN.md` | Backend implementation plan | Architecture decisions and rationale |

### Key Patterns Discovered

1. **DI via `createApp(deps)`**: All external services are passed as optional deps. Tests inject mocks; production passes real implementations. This pattern is consistent across all routes.

2. **Session injection**: `deps.session` is set directly (not via middleware) for testability. In production, the auth middleware would parse cookies and set this.

3. **Contract result pattern**: All contract methods return `ContractResult<T>` with `{ success, data?, error? }`. Routes check `result.success` and map errors to HTTP status codes.

4. **Zod validation**: All request bodies validated with Zod schemas at route entry. Returns `{ code: "VALIDATION_ERROR", details }` on failure.

5. **Error code convention**: `{ code: string, message: string, details?: unknown }`. Codes: `AUTH_REQUIRED`, `VALIDATION_ERROR`, `CONTRACT_ERROR`, `NOT_FOUND`, `ALREADY_LINKED`, `USERNAME_TAKEN`, etc.

6. **TDD flow**: Write failing test → implement minimum code → all tests green → move to next slice. Each test suite covers one route module with mock contracts.

## Work Completed

### Tasks Finished

- [x] Set up Docker Compose with Kubo IPFS (port 5001) + Redis (port 6379)
- [x] Scaffolded Hono app with vitest, configured test scripts
- [x] Implemented IPFS client library (pin, retrieve, unpin) — 6 tests
- [x] Implemented IPFS routes (pin, retrieve, unpin) — 4 tests
- [x] Created 6 contract interfaces (MemoryRegistry, AgentRegistry, ContextRegistry, ChatRegistry, CreditManager, UserRegistry)
- [x] Implemented Memory CRUD routes — 11 tests
- [x] Implemented Agent CRUD routes — 11 tests
- [x] Implemented Context/linking routes (link, unlink, priority, enable/disable) — 14 tests
- [x] Implemented Chat CRUD routes — 11 tests
- [x] Implemented Credit routes (balance, fees, pricing, AI fees) — 6 tests
- [x] Implemented User routes (me, register, update username) — 11 tests
- [x] Implemented Auth routes (SIWE challenge/verify, session) — 4 tests
- [x] Implemented Session Key routes (create, list, get, revoke, validate) — 12 tests
- [x] Created Redis-backed session key store implementation
- [x] Created session types (SessionStore, SessionKeyStore interfaces)
- [x] Wrote API_SCHEMA.md with all 46 endpoints documented
- [x] Wrote BACKEND_PLAN.md with architecture decisions
- [x] Wrote FRONTEND_PLAN.md for post-backend frontend changes

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `packages/hono/package.json` | Added vitest, test scripts | TDD testing framework |
| `packages/hono/src/index.ts` | App entry with DI | Central wiring for all routes |
| `packages/hono/src/lib/ipfs.ts` | IPFS client implementation | Core IPFS integration |
| `packages/hono/src/lib/session-keys.ts` | Redis session key store | Production session key persistence |
| `packages/hono/src/routes/ipfs.ts` | IPFS route handlers | Pin/retrieve/unpin endpoints |
| `packages/hono/src/routes/memories.ts` | Memory CRUD handlers | Memory lifecycle management |
| `packages/hono/src/routes/agents.ts` | Agent CRUD handlers | Agent lifecycle management |
| `packages/hono/src/routes/context.ts` | Context/linking handlers | Agent↔Memory linking |
| `packages/hono/src/routes/chats.ts` | Chat CRUD handlers | Chat lifecycle management |
| `packages/hono/src/routes/credits.ts` | Credit route handlers | Credit balance/fees queries |
| `packages/hono/src/routes/user.ts` | User route handlers | User registration/profile |
| `packages/hono/src/routes/auth.ts` | SIWE auth handlers | Session management |
| `packages/hono/src/routes/session-keys.ts` | Session key handlers | ERC-7715 session key management |
| `packages/hono/src/types/contracts.ts` | 6 contract interfaces | Mock boundaries for DI |
| `packages/hono/src/types/session.ts` | Session types | Session + session key interfaces |
| `packages/hono/src/__tests__/*.ts` | 10 test suites, 92 tests | TDD test coverage |
| `packages/hono/API_SCHEMA.md` | Full API documentation | All 46 endpoints documented |
| `packages/hono/BACKEND_PLAN.md` | Architecture plan | Design decisions |
| `packages/nextjs/FRONTEND_PLAN.md` | Frontend plan | Post-backend changes |
| `docker-compose.yml` | IPFS + Redis | Local dev infrastructure |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Hono over Express/Fastify | Hono, Express, Fastify | Lightweight, edge-ready, good TypeScript support, already in deps |
| kubo-rpc-client over Pinata SDK | Pinata SDK, kubo-rpc-client, helia | kubo-rpc-client works with local Kubo node + Pinata gateway, most flexible |
| DI via createApp(deps) | Global singletons, middleware injection | Testability — mock any dependency without global state |
| Mock contracts in tests | Real chain, Anvil, mocks | Speed (tests run in <1s), no chain dependency, easy to verify behavior |
| Session keys in Redis | Postgres, SQLite, in-memory | TTL support, fast, already in stack, ephemeral by nature |
| TDD vertical slices | Horizontal slicing (all tests first) | Each slice is a complete feature, tests respond to real behavior |
| Zod for validation | Joi, custom, superstruct | Already in deps, good TypeScript inference, composable |
| Vitest over Jest | Jest, Vitest | ESM native, faster, already compatible with Hono |

## Pending Work

## Immediate Next Steps

1. **Swap mock contracts for real Viem clients** — Create `packages/hono/src/lib/contracts.ts` with real Viem publicClient/walletClient, inject via `createApp` in production mode. The interfaces in `packages/hono/src/types/contracts.ts` are the exact shape to implement.
2. **Wire iron-session middleware** — Replace the stub session middleware in `packages/hono/src/index.ts` with real iron-session that reads the `session` cookie, looks up the session in Redis, and sets `c.var.session`.
3. **Implement session key execution** — When the backend needs to call contracts (consume credits, create memory), it should check for an active session key, sign the UserOperation with it, and submit via bundler.
4. **Add streaming chat endpoint** — `POST /chats/:chatId/messages` with SSE streaming via Vercel AI SDK. The endpoint receives decrypted memories from the frontend, assembles system prompt, and streams AI response.
5. **Add rate limiting middleware** — Redis-based rate limiter for IPFS and AI endpoints.

### Blockers/Open Questions

- [ ] ChatRegistry contract doesn't exist yet on-chain — needs to be deployed before chat routes can be tested with real contracts
- [ ] Session key execution requires ERC-4337 bundler + paymaster — need to decide on bundler (Pimlico, Alchemy, custom)
- [ ] AI provider API keys need to be configured in `.env` — currently only Azure Foundry key exists
- [ ] Recovery flow is client-side — backend only provides the `POST /recovery/re-key` endpoint, the actual re-keying happens in the browser

### Deferred Items

- Recovery flow routes (client-side re-keying, minimal backend involvement)
- AuditRegistry integration (events logging for all operations)
- Deployment scripts for production
- API documentation generation (OpenAPI/Swagger)

## Context for Resuming Agent

## Important Context

- **All contract interfaces are mockable boundaries** — `packages/hono/src/types/contracts.ts` defines the exact shape. Real implementations use Viem with `publicClient.readContract()` for reads and `walletClient.writeContract()` for writes.
- **Session is injected directly, not via middleware** — `deps.session` is set in `createApp()`. The auth middleware is a separate concern that parses cookies and populates this. In tests, session is set directly.
- **IPFS data is always encrypted** — The backend never decrypts. Frontend encrypts with `K_data`, sends ciphertext to backend which pins it. Frontend decrypts client-side.
- **Credits are consumed before AI calls** — The backend checks `hasSufficientCredits`, then calls `consumeCredits` on-chain before proxying to AI provider.
- **Session keys use Redis with TTL** — Keys expire automatically. The `validate` method checks both expiry and scope.
- **SIWE test addresses must be valid EIP-55 checksum** — The SIWE library validates address format. Use known test addresses like `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`.
- **IPFS returns CIDv0 (`Qm...`) by default** on local Kubo — tests should accept both CIDv0 and CIDv1 formats.

### Assumptions Made

- Arbitrum Nitro dev node runs on `http://localhost:8547`
- IPFS API available at `http://localhost:5001`
- Redis available at `localhost:6379`
- Frontend runs on `http://localhost:3000`
- Backend runs on `http://localhost:3001`
- All contracts deployed on ArbitrumNitro (chain ID 412346)
- User has pnpm available for package management
- Docker available for infrastructure

### Potential Gotchas

- `pnpm install` fails due to husky postinstall in monorepo — use `--ignore-scripts` flag
- IPFS unpin does NOT immediately delete data from local node — data stays until garbage collection
- The `iron-session` and `siwe` packages are installed but not wired up yet — the auth route creates sessions in-memory, not via iron-session
- Zod v4 is used (not v3) — syntax may differ from older docs
- `kubo-rpc-client` uses `ipfs.add()` which returns CIDv0 by default — to get CIDv1 (`bafy...`), need to configure the IPFS node
- The test file `auth-session-keys.test.ts` uses a pre-created session (bypasses SIWE verification) — production flow requires full SIWE challenge/verify

## Environment State

### Tools/Services Used

- **Docker Compose**: IPFS (Kubo, port 5001) + Redis (7-alpine, port 6379)
- **Hono**: HTTP framework (v4.13.0)
- **Vitest**: Test runner (v4.1.10)
- **kubo-rpc-client**: IPFS client (v6.1.0)
- **ioredis**: Redis client (v6.0.0)
- **SIWE**: Sign-In with Ethereum (v3.0.0)
- **Zod**: Schema validation (v4.4.3)
- **Viem**: Ethereum client (v2.55.11) — installed but not yet used in backend

### Active Processes

- `docker compose up -d` — IPFS + Redis containers running
- No backend dev server running (needs `pnpm dev` in `packages/hono`)

### Environment Variables

- `IPFS_API_URL` — IPFS API endpoint (default: http://localhost:5001)
- `REDIS_URL` — Redis connection string (default: redis://localhost:6379)
- `SESSION_SECRET` — iron-session encryption key (not yet configured)
- `OPENAI_API_KEY` — OpenAI API key (not yet configured)
- `ANTHROPIC_API_KEY` — Anthropic API key (not yet configured)
- `GOOGLE_API_KEY` — Google AI API key (not yet configured)
- `RPC_URL` — Arbitrum RPC endpoint
- `CHAIN_ID` — Target chain ID (412346)
- Contract addresses: `CREDIT_MANAGER_ADDRESS`, `USER_REGISTRY_ADDRESS`, `MEMORY_REGISTRY_ADDRESS`, `AGENT_REGISTRY_ADDRESS`, `CONTEXT_REGISTRY_ADDRESS`, `AUDIT_REGISTRY_ADDRESS`

## Related Resources

- `packages/hono/API_SCHEMA.md` — Full API schema with all 46 endpoints
- `packages/hono/BACKEND_PLAN.md` — Architecture plan and decisions
- `packages/nextjs/FRONTEND_PLAN.md` — Post-backend frontend changes
- `packages/stylus/contracts/` — Smart contract source (Rust/Stylus)
- `docker-compose.yml` — Local infrastructure (IPFS + Redis)
- `.agents/skills/tdd/` — TDD skill reference
- `.agents/skills/interview-me/` — Requirements interview skill

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
