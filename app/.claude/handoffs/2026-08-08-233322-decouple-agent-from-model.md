# Handoff: Decouple Agent Creation from AI Model/Provider

## Session Metadata
- Created: 2026-08-08 23:33:22
- Project: /home/cricro/store/projects/eth-lima/microcoders/app
- Branch: fix/flows
- Session duration: ~20 minutes

### Recent Commits (for context)
  - 1bbf2e2 fix: registration and welcomes
  - 2142f8c fix: w3 session keys misgeneration
  - 6e94bae feat: w3 session keys
  - 9a09a08 fix: remove hardcoded wallet
  - 330b719 fix: cors script fixes

## Handoff Chain

- **Continues from**: [2026-08-08-231800-fix-auth-and-contract-bugs.md](./2026-08-08-231800-fix-auth-and-contract-bugs.md)
  - Previous title: Fix Auth Flow & Contract Integration Bugs
- **Supersedes**: None

## Current State Summary

Successfully decoupled agent creation from AI model/provider selection. Agents no longer store `model` or `tools` fields - these were hardcoded strings with no actual implementation. Model selection is now per-chat-message via a dropdown in the chat input that fetches available models from the `/credits/ai-fees` endpoint. Default model is `gpt-4o-mini` (1 MC cost).

## Codebase Understanding

### Architecture Overview

- **Agent creation**: Creates encrypted blueprints on IPFS, registers on-chain via smart contract. On-chain only stores: name, description, cid, hash.
- **Chat messages**: Backend uses Azure Foundry (OpenAI-compatible API) with configurable model per request.
- **AI pricing**: `AI_FEES` array in `credits.ts` defines available models with costs. Served via `/credits/ai-fees` endpoint.
- **No tool execution**: Tools were just string labels stored in IPFS blueprints - no registry, no execution logic existed.

### Critical Files

| File | Purpose | Relevance |
|------|---------|-----------|
| `packages/hono/src/routes/chat.ts` | Backend chat endpoint | Accepts `model` parameter, forwards to Azure Foundry |
| `packages/hono/src/routes/credits.ts` | AI fee pricing table | Source of truth for available models |
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` | Chat state management | Manages `selectedModel` state |
| `packages/nextjs/src/modules/chat/components/ui/chat-input.tsx` | Chat input UI | Model selector dropdown |
| `packages/nextjs/src/modules/agents/types/agent.ts` | Agent type definitions | Schema without model/tools |
| `packages/nextjs/src/modules/agents/hooks/use-agent.ts` | Agent CRUD operations | Blueprint without model/tools |

### Key Patterns Discovered

- Agent blueprints are encrypted JSON stored on IPFS, referenced by CID on-chain
- Backend API uses Hono framework with Zod validation schemas
- Frontend uses Zustand for global state (`useGlobalState`)
- `AI_FEES` array is the source of truth for available models and pricing
- Azure Foundry uses OpenAI-compatible `/chat/completions` endpoint

## Work Completed

### Tasks Finished

- [x] Removed `model` and `tools` from `AgentSchema` and `AgentBlueprint`
- [x] Removed model dropdown and tools section from agent creation form
- [x] Removed model/tools display from agent info panel and sidebar
- [x] Updated backend to accept `model` parameter in chat messages
- [x] Added model selector dropdown to chat input (fetches from `/credits/ai-fees`)
- [x] Updated default model to `gpt-4o-mini` across frontend and backend
- [x] Fixed all TypeScript errors related to removed fields

### Files Modified

| File | Changes | Rationale |
|------|---------|-----------|
| `packages/nextjs/src/modules/agents/types/agent.ts` | Removed `AgentModelSchema`, `model`, `tools` from schema | Decouple agent from model |
| `packages/nextjs/src/modules/agents/components/ui/agent-form.tsx` | Removed model dropdown, tools section | Agent creation no longer needs these |
| `packages/nextjs/src/modules/agents/hooks/use-agent.ts` | Removed `model`/`tools` from blueprint and all references | Align with new schema |
| `packages/nextjs/src/modules/agents/components/ui/agent-info-panel.tsx` | Removed model display and tools section | No longer relevant |
| `packages/nextjs/src/modules/agents/components/pages/agents-page.tsx` | Updated type annotation | Align with new schema |
| `packages/hono/src/routes/chat.ts` | Added `model` to schema, uses it in AI call | Enable per-message model selection |
| `packages/nextjs/src/modules/chat/hooks/use-chat.ts` | Added `selectedModel` state, passes to API | Manage model selection |
| `packages/nextjs/src/modules/chat/components/ui/chat-input.tsx` | Added model dropdown | UI for model selection |
| `packages/nextjs/src/modules/chat/components/pages/chat-page.tsx` | Passes model props to ChatInput | Wire up model selection |
| `packages/nextjs/services/store/store.ts` | Updated default provider to `gpt-4o-mini` | Consistent defaults |
| `packages/nextjs/app/(app)/agents/page.tsx` | Removed model/tools display | Align with new schema |
| `packages/nextjs/src/modules/agents/components/ui/agent-chat.tsx` | Removed tools prop | No longer relevant |
| `packages/nextjs/src/modules/agents/components/ui/agent-sidebar.tsx` | Removed model display | No longer relevant |
| `packages/nextjs/src/modules/agents/index.ts` | Removed `AgentModel`/`AgentModelSchema` exports | No longer exist |

### Decisions Made

| Decision | Options Considered | Rationale |
|----------|-------------------|-----------|
| Default model: `gpt-4o-mini` | `mistral-small-latest`, `gpt-4o`, `gemini-2.0-flash` | Cheapest option (1 MC), available in AI_FEES |
| Model selector placement: Left of input | Right of input, separate row | Most intuitive position, before attach/agent badges |
| Remove tools entirely | Keep empty for future | No tools exist, no registry, no execution logic |
| Source of truth: `AI_FEES` in credits.ts | Hardcoded list, API endpoint | Already exists, serves via `/credits/ai-fees` |

## Pending Work

### Immediate Next Steps

1. Test the model selector dropdown fetches models correctly from `/credits/ai-fees`
2. Verify chat messages use the selected model (check Foundry API call)
3. Test agent creation works without model/tools fields
4. Consider adding model-specific token limits or pricing display

### Blockers/Open Questions

- [ ] Are all models in `AI_FEES` actually deployed on Azure Foundry?
- [ ] Does the Azure Foundry endpoint support all listed models?
- [ ] Should we add credit cost display next to model selector?

### Deferred Items

- Streaming chat responses (Phase 5 - not yet implemented)
- Tool execution engine (no tools exist yet)
- Model-specific system prompts or behaviors

## Context for Resuming Agent

### Important Context

The `AI_FEES` array in `packages/hono/src/routes/credits.ts` is the source of truth for available models. It contains 6 models from 3 providers (OpenAI, Anthropic, Google). The chat backend forwards the selected model to Azure Foundry which uses an OpenAI-compatible API format.

Agent creation form now only has: name, description, icon, personality, instructions, and persistent memory toggle. Model is selected per chat message, not per agent.

### Assumptions Made

- Azure Foundry supports all models listed in `AI_FEES`
- Model names in `AI_FEES` match Azure Foundry deployment names
- Users want to pick model per message, not per agent
- No tools need to be stored with agents (none exist)

### Potential Gotchas

- The `AI_FEES` models may not all be deployed on Azure Foundry - verify before adding new ones
- Model selection state is per-session, not per-conversation
- The `selectedProvider` in Zustand store is not used for routing - only `selectedModel` in `use-chat.ts` matters

## Environment State

### Tools/Services Used

- Azure Foundry (FOUNDRY_URL, FOUNDRY_KEY in .env)
- Hono backend server at :3001
- Next.js frontend at :3000

### Active Processes

- None (development session completed)

### Environment Variables

- `FOUNDRY_URL` - Azure Foundry endpoint URL
- `FOUNDRY_KEY` - Azure Foundry API key

## Related Resources

- `packages/hono/src/routes/credits.ts` - AI_FEES pricing table (lines 6-13)
- `packages/hono/src/routes/chat.ts` - Chat endpoint with model parameter
- `packages/nextjs/src/modules/chat/hooks/use-chat.ts` - Model state management
- `packages/nextjs/src/modules/chat/components/ui/chat-input.tsx` - Model selector UI

---

**Security Reminder**: Before finalizing, run `validate_handoff.py` to check for accidental secret exposure.
