# Handoff: Stylus WASM Rebuild & Contract Initialization Fix

## Session Metadata
- Created: 2026-08-08 19:52:54
- Project: /home/cricro/store/projects/eth-lima/microcoders/app
- Branch: fix/flows
- Session duration: ~35 minutes

### Recent Commits (for context)
  - f0da70e fix: devnode launch
  - e340e6c chore: polish deps, env examples
  - b2c95e7 fix: session disconnect and onboarding onchain check
  - 6357ade feat: update contracts
  - 548c1ee feat: add utils, components from front

## Handoff Chain

- **Continues from**: [2026-08-08-191622-nitro-devnode-stylus-deploy.md](./2026-08-08-191622-nitro-devnode-stylus-deploy.md)
  - Previous title: Nitro DevNode Startup & Stylus Contract Deployment
- **Supersedes**: None

## Current State Summary

Diagnosed and fixed the contract initialization failures for MemoryRegistry, AgentRegistry, and ContextRegistry. The root cause was **stale WASM binaries** — the pre-built `.wasm` files in `packages/stylus/contracts/target/` were compiled on Aug 5 and never rebuilt. The old binaries caused bare WASM panics (`0x` revert data) when `stylus-core`-dependent contracts tried to write to storage during `initialize()`. Rebuilding all 6 WASM binaries from source using the local Rust 1.91.0 toolchain fixed the issue. All 6 contracts now deploy, initialize, and authorize correctly. Added a Docker-based predeploy build step to prevent stale binaries in the future.

## Codebase Understanding

### Architecture Overview

- **Monorepo**: pnpm workspace with `packages/nextjs` (frontend), `packages/hono` (backend), `packages/stylus` (smart contracts)
- **Smart Contracts**: 6 Rust/Stylus contracts deployed on local Nitro dev node (chain ID 412346)
- **WASM Build Pipeline**: `cargo build --target wasm32-unknown-unknown --release` produces `.wasm` binaries in `packages/stylus/contracts/target/wasm32-unknown-unknown/release/`
- **Deploy Pipeline**: `pnpm deploy:contracts` → predeploy hook builds WASM in Docker → `cargo stylus deploy --wasm-file=...` deploys each contract
- **Contract Dependency Order**: credit-manager → user-registry → memory-registry → agent-registry → context-registry → audit-registry
- **Contract Categories**:
  - Simple (no `stylus-core`): CreditManager, UserRegistry, AuditRegistry
  - Cross-contract (uses `stylus-core::calls::Call`): MemoryRegistry, AgentRegistry, ContextRegistry

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `packages/stylus/scripts/build_wasm.sh` | Docker-based WASM builder | **NEW** — predeploy hook, builds all 6 WASM binaries inside `nitro-node-stylus-dev` container |
| `packages/stylus/scripts/deploy_contract.ts` | Single contract deployment | Uses `--wasm-file` to deploy pre-built WASM (line 70-74) |
| `packages/stylus/scripts/init_contracts.ts` | Contract initialization & authorization | Calls `initialize()` and `authorizeUpdater()`/`authorizeConsumer()` |
| `packages/stylus/scripts/deploy.ts` | Orchestrates full deployment | Calls deploy_contract for each contract, then initContracts |
| `packages/stylus/package.json` | Package scripts | `predeploy:contracts` hook added |
| `packages/stylus/contracts/Cargo.toml` | Workspace Cargo config | stylus-sdk 0.10.8, stylus-core 0.10.8, alloy-primitives 1.5.7 |
| `packages/stylus/contracts/memorychain-common/src/events.rs` | Shared event definitions | Debug events were added/removed during diagnosis (clean now) |
| `packages/stylus/contracts/memory-registry/src/lib.rs` | MemoryRegistry contract | Debug events were added/removed during diagnosis (clean now) |
| `nitro-devnode/run-dev-node.sh` | Nitro dev node startup | Includes chain setup: owner, ArbOS v60, CREATE2, Cache Manager, StylusDeployer |
| `nitro-devnode/stylus-dev/Dockerfile` | Docker image for build + node | Rust 1.91.0, cargo-stylus 0.10.8, wasm32-unknown-unknown target |

### Key Patterns Discovered

- **WASM binaries are git-ignored**: `packages/stylus/contracts/target/` is excluded from git. Each developer must build locally or use the predeploy hook.
- **`cargo stylus deploy` without `--wasm-file` fails silently**: The deploy script comment (command.ts:70-71) documents this. Always use `--wasm-file` with pre-built WASM.
- **`#[public]` macro doesn't dispatch `macro_rules!`-generated functions**: Functions from `impl_pausable!()` and `impl_admin_transfer!()` macros (pause, unpause, isPaused, proposeAdmin, acceptAdmin, pendingAdmin) are NOT in the WASM dispatch table on ANY contract. The hardcoded ABI in `generateabis.ts` lists them but they won't work at runtime.
- **Stale WASM causes bare panics, not descriptive errors**: When the WASM binary is incompatible with the node, functions revert with empty `0x` data — no error message, no revert reason.
- **Docker builds run as root**: The `build_wasm.sh` script includes `chown` to fix file ownership after Docker builds.
- **Nitro dev node is ephemeral**: Chain state resets on container restart. Redeploy contracts after restart.

## Work Completed

### Tasks Finished

- [x] Diagnosed root cause: stale WASM binaries from Aug 5 caused WASM panics on `stylus-core`-dependent contracts
- [x] Installed local Rust 1.91.0 toolchain (`rustup default 1.91.0`, `rustup target add wasm32-unknown-unknown`)
- [x] Rebuilt all 6 WASM binaries from source
- [x] Verified MemoryRegistry.initialize works with fresh WASM (all 7 debug steps emitted, status 1)
- [x] Cleaned up debug events from MemoryRegistry and events.rs
- [x] Full re-deployed all 6 contracts with fresh WASM
- [x] All 6 contracts initialized successfully
- [x] Cross-contract authorization completed (authorizeConsumer + authorizeUpdater)
- [x] Created `packages/stylus/scripts/build_wasm.sh` — Docker-based WASM builder
- [x] Added `predeploy:contracts` hook to `packages/stylus/package.json`
- [x] Verified predeploy hook works end-to-end

### Deployed Contract Addresses (Current)

| Contract | Address |
|---|---|
| credit-manager | `0x0702aa6ec5fbc66a4ccddaaa9b29cb667f6528e3` |
| user-registry | `0x858c481353e5cd7485c35fcec35b2c9150218d93` |
| memory-registry | `0x9268bb5c5f6403ff02a89dcff7ddbb07ff046f99` |
| agent-registry | `0x77edb6f64f86a6794d5da3a34aa9fbbe8e61e852` |
| context-registry | `0x104f5cc5d1593f1ba2a0eecf5882be85e231aca9` |
| audit-registry | `0x15f7fe757a582634e1ed105ea68f07f6cf240b37` |

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `packages/stylus/scripts/build_wasm.sh` | **Created** — Docker-based WASM build script | Prevents stale WASM by building inside Docker before every deploy |
| `packages/stylus/package.json` | Added `predeploy:contracts` script | Auto-triggers WASM build before `deploy:contracts` |
| `packages/stylus/contracts/memorychain-common/src/events.rs` | Added then removed `DebugStep` event | Diagnostic only — removed after root cause confirmed |
| `packages/stylus/contracts/memory-registry/src/lib.rs` | Added then removed debug event logging in `initialize()` | Diagnostic only — removed after root cause confirmed |
| `packages/nextjs/contracts/deployedContracts.ts` | Auto-generated with new addresses | Created by deploy script |
| `packages/stylus/deployments/412346_latest.json` | Auto-generated deployment artifacts | Created by deploy script |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Rebuild WASM from source vs use Docker build during deploy | Keep `--wasm-file` + predeploy hook; Remove `--wasm-file` and let `cargo stylus deploy` build | Kept `--wasm-file` because `cargo stylus deploy` without it "fails silently" (documented in command.ts:70-71). Predeploy hook ensures fresh WASM. |
| Build WASM in Docker vs locally | Local `cargo build`; Docker `nitro-node-stylus-dev` | Docker ensures consistent builds with the exact Rust/cargo-stylus version matching the Nitro node. Local builds may use different toolchain versions. |
| Install Rust locally for diagnosis | Skip diagnosis; Install Rust 1.91.0 locally | Needed to rebuild quickly for diagnosis. Docker build would have been slower for iterative testing. |

## Pending Work

### Immediate Next Steps

1. **Test frontend against deployed contracts**: Run `pnpm next:dev` and verify the app can read/write to the deployed contracts on `localhost:8547`
2. **Fix `#[public]` macro + `macro_rules!` dispatch issue**: Functions from `impl_pausable!()` and `impl_admin_transfer!()` (pause, unpause, isPaused, proposeAdmin, acceptAdmin, pendingAdmin) are NOT dispatched. Either rewrite these functions inline instead of using macros, or investigate Stylus SDK `#[public]` macro behavior with macro-generated code.
3. **Rebuild WASM from source to remove debug artifacts**: The current deployed WASM was built locally (not Docker). Run `pnpm predeploy:contracts` to rebuild with Docker for production consistency.

### Blockers/Open Questions

- [ ] **`#[public]` macro doesn't see macro-generated functions**: pause/unpause/isPaused/proposeAdmin/acceptAdmin/pendingAdmin are in the hardcoded ABI but NOT in the WASM dispatch table. This affects ALL 6 contracts. Need to either rewrite inline or fix the macro interaction.
- [ ] **ABI export fails on Nitro dev**: `cargo stylus export-abi` fails with "Unexpected non-whitespace character after JSON". The deploy script handles this gracefully using hardcoded ABIs from `generateabis.ts`.
- [ ] **`deployedContracts.ts` may have stale ABI**: Generated ABIs are from `generateabis.ts` (hardcoded), not from actual WASM. If contract interfaces change, the hardcoded ABIs must be manually updated.

### Deferred Items

- Set up persistent chain data (current dev node is ephemeral — resets on restart)
- Verify frontend integration with new contract addresses

## Context for Resuming Agent

### Important Context

**The Nitro dev node is running** on `localhost:8547`. It's a Docker container named `nitro-dev`. Stop it with `docker stop nitro-dev`.

**The dev wallet** is `0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E` with private key `0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659`. It's pre-funded with ETH. Add to MetaMask with chain ID `412346`, RPC `http://localhost:8547`, symbol `ETH`.

**Rust toolchain is installed locally**: `rustup default 1.91.0` with `wasm32-unknown-unknown` target. This was installed for diagnosis. The predeploy hook uses Docker instead.

**WASM rebuild command** (if needed outside deploy):
```bash
# Via Docker (preferred — matches node toolchain):
pnpm predeploy:contracts

# Via local toolchain (faster for iteration):
cd packages/stylus/contracts && cargo build --target wasm32-unknown-unknown --release
```

**Full redeploy command**:
```bash
cd packages/stylus && pnpm deploy:contracts --network arbitrumNitro
```

### Assumptions Made

- Docker is available and running
- `cast` (Foundry) is installed and in PATH
- The `nitro-node-stylus-dev:latest` Docker image exists (built by `run-dev-node.sh --stylus`)
- The `.env` file in `packages/stylus/` is configured for Nitro dev (it is)

### Potential Gotchas

- **WASM binaries are git-ignored**: They're in `packages/stylus/contracts/target/` which is excluded from git. Always run `pnpm predeploy:contracts` before deploying to ensure fresh binaries.
- **Nitro dev node is ephemeral**: Chain state resets on container restart. Redeploy contracts after restart.
- **Docker builds run as root**: `build_wasm.sh` includes `chown` to fix ownership. If you build manually with Docker, run `chown -R $(id -u):$(id -g) packages/stylus/contracts/target/` afterward.
- **`pause()`/`unpause()`/`isPaused()` don't work**: These are macro-generated functions not in the WASM dispatch table. Don't call them — they'll revert with bare `0x`.
- **Function selectors are camelCase in ABI**: `credit_manager()` in Rust becomes `creditManager()` in the ABI. Use camelCase when calling via `cast`.

### Teardown / Reset from Scratch

```bash
# Stop and remove the container
docker rm -f nitro-dev

# Remove deployment artifacts (forces fresh deploys)
rm packages/stylus/deployments/412346_latest.json
rm packages/nextjs/contracts/deployedContracts.ts

# (Optional) Remove local Rust toolchain (was installed for diagnosis)
rustup toolchain remove 1.91.0

# Re-run
cd nitro-devnode && bash ./run-dev-node.sh --stylus
cd ../packages/stylus && pnpm deploy:contracts --network arbitrumNitro
```

## Environment State

### Tools/Services Used

- Docker (`nitro-node-stylus-dev:latest`, Nitro v3.11.0-a618155)
- Foundry (`cast` v1.7.1-dev)
- `cargo stylus` v0.10.8 (host + Docker)
- Rust 1.91.0 (local, installed during session)
- pnpm (monorepo package manager)
- Node.js / TypeScript (`ts-node` for deploy scripts)

### Active Processes

- Docker container `nitro-dev` running on port 8547 (detached)

### Environment Variables

- `RPC_URL_NITRO` = `http://localhost:8547` (in `packages/stylus/.env`)
- `PRIVATE_KEY_NITRO` = dev wallet private key (in `packages/stylus/.env`)
- `ACCOUNT_ADDRESS_NITRO` = `0x3f1Eae7D46d88F08fc2F8ed27FCb2AB183EB2d0E` (in `packages/stylus/.env`)

## Related Resources

- Nitro DevNode setup: `nitro-devnode/run-dev-node.sh`
- WASM build script: `packages/stylus/scripts/build_wasm.sh`
- Contract deployment scripts: `packages/stylus/scripts/`
- Deployment artifacts: `packages/stylus/deployments/412346_latest.json`
- Frontend contract bindings: `packages/nextjs/contracts/deployedContracts.ts`
- Cargo workspace: `packages/stylus/contracts/Cargo.toml`
- Previous handoff: `2026-08-08-191622-nitro-devnode-stylus-deploy.md`

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
