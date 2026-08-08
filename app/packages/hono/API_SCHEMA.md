# API Schema — MemoryChain Backend

Base URL: `http://localhost:3001`

All endpoints return JSON unless otherwise noted. Authentication is via `iron-session` cookie (set after SIWE verification). Protected endpoints return `401` if no valid session exists.

---

## Error Response Shape (all endpoints)

```typescript
interface ErrorResponse {
  code: string;        // machine-readable error code
  message: string;     // human-readable description
  details?: unknown;   // optional context (validation errors, etc.)
}
```

---

## 1. Authentication

### `GET /auth/challenge`

**Description:** Generates a SIWE (Sign-In with Ethereum) message for the user to sign. Returns a random nonce and the formatted SIWE message string.

**Auth:** None

**Response:**
```typescript
{
  nonce: string;       // random hex nonce for replay protection
  message: string;     // SIWE message to sign, e.g. "localhost:3001 wants you to sign in with your Ethereum account:\n0x..."
  expiresAt: number;   // unix timestamp, 5 minutes from now
}
```

---

### `POST /auth/verify`

**Description:** Verifies the user's SIWE signature, creates an encrypted session cookie. The session stores the wallet address, chain ID, and username (if registered).

**Auth:** None

**Request:**
```typescript
{
  message: string;     // the SIWE message that was signed
  signature: `0x${string}`;  // the wallet signature
  address: `0x${string}`;    // wallet address
  chainId: number;     // chain ID (412346 for ArbitrumNitro)
}
```

**Response:**
```typescript
{
  address: `0x${string}`;
  chainId: number;
  username: string | null;   // from UserRegistry if registered
  isRegistered: boolean;     // whether user exists in UserRegistry
}
```

**Side effects:** Sets `iron-session` cookie in response headers.

---

### `GET /auth/session`

**Description:** Returns the current session data. Used by the frontend to check if the user is authenticated and get session details.

**Auth:** Session cookie required

**Response:**
```typescript
{
  address: `0x${string}`;
  chainId: number;
  username: string | null;
  isRegistered: boolean;
}
```

---

### `DELETE /auth/session`

**Description:** Destroys the current session (logout).

**Auth:** Session cookie required

**Response:**
```typescript
{
  success: true;
}
```

---

## 2. IPFS

### `POST /ipfs/pin`

**Description:** Pins already-encrypted data to IPFS via Pinata. The backend receives a base64-encoded ciphertext blob and pins it. Returns the CID and SHA-256 hash. The backend does NOT decrypt — data arrives encrypted from the frontend.

**Auth:** Session cookie required

**Request:**
```typescript
{
  data: string;        // base64-encoded ciphertext
  name: string;        // human-readable name for Pinata pin
  mimeType?: string;   // default: "application/octet-stream"
}
```

**Response:**
```typescript
{
  cid: string;         // IPFS Content Identifier (e.g., "bafybeigdyr...")
  hash: string;        // SHA-256 hex hash of the ciphertext (computed by backend for verification)
  pinSize: number;     // size in bytes
  pinnedAt: number;    // unix timestamp
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Decodes the base64 data to a Buffer
3. Computes SHA-256 hash of the buffer
4. Uploads the buffer to Pinata IPFS pinning service with the provided name
5. Returns the CID assigned by IPFS, the computed hash, pin size, and timestamp

---

### `GET /ipfs/:cid`

**Description:** Retrieves encrypted data from IPFS by CID. Returns the raw ciphertext as base64. The frontend decrypts client-side.

**Auth:** Session cookie required

**Params:** `cid` — IPFS Content Identifier

**Response:**
```typescript
{
  cid: string;
  data: string;        // base64-encoded ciphertext
  size: number;        // size in bytes
  mimeType: string;    // content type
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Fetches the content from IPFS via Pinata gateway (or kubo-rpc-client fallback)
3. Encodes the raw bytes to base64
4. Returns the data with metadata

---

### `DELETE /ipfs/:cid`

**Description:** Unpins data from IPFS. Used when data is archived or deleted.

**Auth:** Session cookie required

**Params:** `cid` — IPFS Content Identifier

**Response:**
```typescript
{
  success: true;
  cid: string;
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Calls Pinata unpin API for the given CID
3. Returns success confirmation

---

## 3. Memories

### `POST /memories/create`

**Description:** Creates a new memory. The backend: (1) pins the encrypted content to IPFS, (2) calls MemoryRegistry.createMemory on-chain with the CID, hash, type, and visibility, (3) stores the wallet and recovery envelopes. Consumes credits on-chain.

**Auth:** Session cookie required (session key or wallet signature)

**Request:**
```typescript
{
  name: string;                    // memory title/name
  cid: string;                     // IPFS CID (already pinned by frontend or via /ipfs/pin)
  hash: string;                    // SHA-256 hex hash of the ciphertext
  memoryType: number;              // 0=Preference, 1=Knowledge, 2=Document, 3=Objective, 4=Other
  visibility: number;              // 0=Private, 1=Shared, 2=Public
  walletEnvelope: string;          // base64-encoded: K_data encrypted with K_wallet
  recoveryEnvelope: string;        // base64-encoded: K_data encrypted with K_recovery
}
```

**Response:**
```typescript
{
  memoryId: string;                // bytes32 hex (on-chain memory ID)
  cid: string;                     // IPFS CID
  hash: string;                    // SHA-256 hash
  version: number;                 // 1 (initial version)
  memoryType: number;
  visibility: number;
  createdAt: number;               // unix timestamp
  creditsConsumed: number;         // MC consumed
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Validates request body with Zod schema
3. Checks user has sufficient credits via CreditManager.balanceOf
4. Calls MemoryRegistry.createMemory(cid, hash, memoryType, visibility) — this consumes credits on-chain internally
5. Returns the memory ID and metadata

**Note:** The wallet and recovery envelopes are sent by the frontend and stored client-side (in browser storage or a separate metadata store). The backend does NOT store envelopes — they are the frontend's responsibility. If you want backend envelope storage for cross-device access, a separate encrypted metadata endpoint can be added.

---

### `GET /memories`

**Description:** Lists all memories for the connected user. Returns metadata only (no encrypted content). The frontend fetches content separately via `/ipfs/:cid` and decrypts client-side.

**Auth:** Session cookie required

**Query params:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)
- `type` (optional, filter by memory type: 0-4)
- `status` (optional, filter by status: 0=Active, 1=Archived)

**Response:**
```typescript
{
  memories: Array<{
    memoryId: string;              // bytes32 hex
    name: string;                  // memory title (stored on-chain)
    cid: string;                   // latest IPFS CID
    hash: string;                  // latest SHA-256 hash
    version: number;               // current version number
    memoryType: number;
    visibility: number;
    status: number;                // 0=Active, 1=Archived
    createdAt: number;
    updatedAt: number;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Reads the user's address from the session
3. Queries MemoryRegistry.getMemoryCountByOwner(userAddress) to get total count
4. Iterates through owner_memories mapping to get all memory IDs
5. For each memory ID, calls MemoryRegistry.getMemory(memoryId) to get metadata
6. Returns paginated list with metadata

---

### `GET /memories/:id`

**Description:** Gets metadata for a single memory.

**Auth:** Session cookie required

**Params:** `id` — memoryId (bytes32 hex)

**Response:**
```typescript
{
  memoryId: string;
  name: string;
  cid: string;
  hash: string;
  version: number;
  memoryType: number;
  visibility: number;
  status: number;
  createdAt: number;
  updatedAt: number;
  owner: string;                   // wallet address
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Calls MemoryRegistry.getMemory(memoryId)
3. Verifies the caller is the owner
4. Returns the metadata

---

### `PUT /memories/:id`

**Description:** Updates a memory (new version). The frontend re-encrypts the content with the same K_data (or generates new K_data), pins the new ciphertext, and sends the new CID/hash. The backend calls MemoryRegistry.updateMemory on-chain.

**Auth:** Session cookie required (must be memory owner)

**Params:** `id` — memoryId (bytes32 hex)

**Request:**
```typescript
{
  cid: string;                     // new IPFS CID
  hash: string;                    // new SHA-256 hash
  walletEnvelope?: string;         // updated envelope (if K_data changed)
  recoveryEnvelope?: string;       // updated envelope (if K_data changed)
}
```

**Response:**
```typescript
{
  memoryId: string;
  cid: string;                     // new CID
  hash: string;                    // new hash
  version: number;                 // incremented version
  updatedAt: number;
  creditsConsumed: number;         // 1 MC for update
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Validates the caller owns the memory
3. Checks sufficient credits
4. Calls MemoryRegistry.updateMemory(memoryId, cid, hash) — consumes 1 MC
5. Returns updated metadata

---

### `POST /memories/:id/archive`

**Description:** Archives a memory (sets status to Archived). The memory can be restored later.

**Auth:** Session cookie required (must be memory owner)

**Params:** `id` — memoryId

**Response:**
```typescript
{
  memoryId: string;
  status: 1;                       // Archived
}
```

---

### `POST /memories/:id/restore`

**Description:** Restores an archived memory (sets status to Active).

**Auth:** Session cookie required (must be memory owner)

**Params:** `id` — memoryId

**Response:**
```typescript
{
  memoryId: string;
  status: 0;                       // Active
}
```

---

### `GET /memories/:id/versions`

**Description:** Lists all versions of a memory.

**Auth:** Session cookie required (must be memory owner)

**Params:** `id` — memoryId

**Response:**
```typescript
{
  versions: Array<{
    version: number;
    cid: string;
    hash: string;
    createdAt: number;
  }>;
  latestVersion: number;
}
```

---

## 4. Agents

### `POST /agents/create`

**Description:** Creates a new AI agent blueprint. The backend calls AgentRegistry.createAgent on-chain. Consumes 5 MC.

**Auth:** Session cookie required

**Request:**
```typescript
{
  name: string;                    // agent name
  description: string;             // agent description
  cid: string;                     // IPFS CID of encrypted agent blueprint
  hash: string;                    // SHA-256 hash of ciphertext
  walletEnvelope: string;          // base64-encoded: K_data encrypted with K_wallet
  recoveryEnvelope: string;        // base64-encoded: K_data encrypted with K_recovery
}
```

**Response:**
```typescript
{
  agentId: string;                 // bytes32 hex
  name: string;
  description: string;
  cid: string;
  hash: string;
  version: number;                 // 1
  createdAt: number;
  creditsConsumed: number;         // 5 MC
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Validates request body
3. Checks sufficient credits (need 5 MC)
4. Calls AgentRegistry.createAgent(name, description, cid, hash)
5. Returns agent metadata

---

### `GET /agents`

**Description:** Lists all agents for the connected user.

**Auth:** Session cookie required

**Query params:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)
- `status` (optional, 0=Active, 1=Archived)

**Response:**
```typescript
{
  agents: Array<{
    agentId: string;
    name: string;
    description: string;
    cid: string;
    hash: string;
    version: number;
    status: number;
    createdAt: number;
    updatedAt: number;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

---

### `GET /agents/:id`

**Description:** Gets metadata for a single agent.

**Auth:** Session cookie required

**Params:** `id` — agentId (bytes32 hex)

**Response:**
```typescript
{
  agentId: string;
  name: string;
  description: string;
  cid: string;
  hash: string;
  version: number;
  status: number;
  createdAt: number;
  updatedAt: number;
  owner: string;
}
```

---

### `PUT /agents/:id`

**Description:** Updates an agent blueprint (new version). Consumes 2 MC.

**Auth:** Session cookie required (must be agent owner)

**Params:** `id` — agentId

**Request:**
```typescript
{
  cid: string;
  hash: string;
  walletEnvelope?: string;
  recoveryEnvelope?: string;
}
```

**Response:**
```typescript
{
  agentId: string;
  cid: string;
  hash: string;
  version: number;
  updatedAt: number;
  creditsConsumed: number;         // 2 MC
}
```

---

### `POST /agents/:id/archive`

**Description:** Archives an agent.

**Auth:** Session cookie required (must be agent owner)

**Params:** `id` — agentId

**Response:**
```typescript
{
  agentId: string;
  status: 1;
}
```

---

### `POST /agents/:id/restore`

**Description:** Restores an archived agent.

**Auth:** Session cookie required (must be agent owner)

**Params:** `id` — agentId

**Response:**
```typescript
{
  agentId: string;
  status: 0;
}
```

---

## 5. Context (Agent <-> Memory Linking)

### `POST /context/link`

**Description:** Links a memory to an agent with a given priority. The memory will be included in AI context when this agent is used. Consumes 1 MC (if fee > 0).

**Auth:** Session cookie required (must own both agent and memory)

**Request:**
```typescript
{
  agentId: string;                 // bytes32 hex
  memoryId: string;                // bytes32 hex
  priority: number;                // 0-255, higher = more important in context ordering
}
```

**Response:**
```typescript
{
  contextId: string;               // bytes32 hex
  agentId: string;
  memoryId: string;
  priority: number;
  enabled: true;
  createdAt: number;
  creditsConsumed: number;         // 0 or 1 MC
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Validates the caller owns both the agent and the memory
3. Calls ContextRegistry.linkMemory(agentId, memoryId, priority)
4. Returns the context ID

---

### `DELETE /context/unlink`

**Description:** Unlinks a memory from an agent.

**Auth:** Session cookie required (must own either agent or memory)

**Request:**
```typescript
{
  agentId: string;
  memoryId: string;
}
```

**Response:**
```typescript
{
  success: true;
  agentId: string;
  memoryId: string;
}
```

---

### `PUT /context/:contextId/priority`

**Description:** Changes the priority of a linked memory.

**Auth:** Session cookie required

**Params:** `contextId` — bytes32 hex

**Request:**
```typescript
{
  priority: number;                // new priority (0-255)
}
```

**Response:**
```typescript
{
  contextId: string;
  priority: number;
}
```

---

### `POST /context/:contextId/disable`

**Description:** Disables a memory link (memory is skipped in AI context but link is preserved).

**Auth:** Session cookie required

**Params:** `contextId`

**Response:**
```typescript
{
  contextId: string;
  enabled: false;
}
```

---

### `POST /context/:contextId/enable`

**Description:** Re-enables a disabled memory link.

**Auth:** Session cookie required

**Params:** `contextId`

**Response:**
```typescript
{
  contextId: string;
  enabled: true;
}
```

---

### `GET /context/agent/:agentId/memories`

**Description:** Lists all memory links for an agent. Returns metadata only (no encrypted content).

**Auth:** Session cookie required

**Params:** `agentId`

**Response:**
```typescript
{
  links: Array<{
    contextId: string;
    memoryId: string;
    name: string;                  // memory name from MemoryRegistry
    cid: string;                   // memory CID (for IPFS fetch)
    priority: number;
    enabled: boolean;
    createdAt: number;
  }>;
  total: number;
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Queries ContextRegistry.getAgentContextCount(agentId)
3. Iterates through agent_contexts mapping to get all context IDs
4. For each context, calls ContextRegistry.getContext(contextId) to get metadata
5. For each memory, calls MemoryRegistry.getMemory(memoryId) to get name + CID
6. Returns the list

---

### `GET /context/agent/:agentId/memories/decrypted`

**Description:** Fetches all linked memories for an agent and returns their encrypted content from IPFS. The frontend decrypts client-side. This is a convenience endpoint — the frontend could also call `/ipfs/:cid` for each memory individually.

**Auth:** Session cookie required

**Params:** `agentId`

**Response:**
```typescript
{
  memories: Array<{
    memoryId: string;
    name: string;
    cid: string;
    data: string;                  // base64-encoded ciphertext (for client-side decryption)
    priority: number;
  }>;
}
```

---

## 6. Chats

### `POST /chats/create`

**Description:** Creates a new chat. Calls ChatRegistry.createChat on-chain (new contract TBD). Consumes credits.

**Auth:** Session cookie required

**Request:**
```typescript
{
  name: string;                    // chat title
  agentId: string;                 // bytes32 hex of the agent for this chat
  cid: string;                     // IPFS CID of initial chat metadata (encrypted)
  hash: string;                    // SHA-256 hash
}
```

**Response:**
```typescript
{
  chatId: string;                  // bytes32 hex
  name: string;
  agentId: string;
  cid: string;
  hash: string;
  version: number;                 // 1
  createdAt: number;
  creditsConsumed: number;
}
```

---

### `GET /chats`

**Description:** Lists all chats for the connected user.

**Auth:** Session cookie required

**Query params:**
- `page` (optional, default: 1)
- `limit` (optional, default: 20, max: 100)

**Response:**
```typescript
{
  chats: Array<{
    chatId: string;
    name: string;
    agentId: string;
    cid: string;
    hash: string;
    version: number;
    status: number;
    createdAt: number;
    updatedAt: number;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

---

### `GET /chats/:id`

**Description:** Gets metadata for a single chat.

**Auth:** Session cookie required

**Params:** `id` — chatId

**Response:**
```typescript
{
  chatId: string;
  name: string;
  agentId: string;
  cid: string;
  hash: string;
  version: number;
  status: number;
  createdAt: number;
  updatedAt: number;
  owner: string;
}
```

---

### `PUT /chats/:id`

**Description:** Updates chat metadata (name, etc.). Consumes credits.

**Auth:** Session cookie required (must be chat owner)

**Params:** `id` — chatId

**Request:**
```typescript
{
  cid: string;                     // new IPFS CID of updated chat metadata
  hash: string;                    // new hash
}
```

**Response:**
```typescript
{
  chatId: string;
  cid: string;
  hash: string;
  version: number;
  updatedAt: number;
  creditsConsumed: number;
}
```

---

### `POST /chats/:id/archive`

**Description:** Archives a chat.

**Auth:** Session cookie required (must be chat owner)

**Params:** `id` — chatId

**Response:**
```typescript
{
  chatId: string;
  status: 1;
}
```

---

### `POST /chats/:chatId/messages`

**Description:** Sends a message to a chat and streams the AI response via SSE. The backend: (1) fetches linked memories for the agent, (2) verifies credits, (3) consumes credits, (4) assembles system prompt with full memory context, (5) proxies to AI provider, (6) streams response back.

**Auth:** Session cookie required

**Params:** `chatId`

**Request:**
```typescript
{
  content: string;                 // user message
  agentId: string;                 // agent to use
  provider: string;                // e.g., "openai:gpt-4o", "anthropic:claude-sonnet-4-20250514"
  memoryContext: string[];         // array of decrypted memory content strings (frontend decrypts client-side)
}
```

**Response:** SSE stream (`Content-Type: text/event-stream`)

```
data: {"type":"start","provider":"openai:gpt-4o","creditsUsed":2}

data: {"type":"text-delta","delta":"Hello"}

data: {"type":"text-delta","delta":", how can I"}

data: {"type":"text-delta","delta":" help you today?"}

data: {"type":"finish","usage":{"promptTokens":1234,"completionTokens":56}}

data: [DONE]
```

**SSE Event Types:**
```typescript
// Start event
{ type: "start"; provider: string; creditsUsed: number }

// Text delta (streaming)
{ type: "text-delta"; delta: string }

// Reasoning/thinking (for models that support it)
{ type: "reasoning"; delta: string }

// Tool call
{ type: "tool-call"; toolName: string; args: unknown; result?: unknown }

// Finish
{ type: "finish"; usage: { promptTokens: number; completionTokens: number } }

// Error
{ type: "error"; code: string; message: string }
```

**What it does step-by-step:**
1. Validates the session cookie
2. Validates request body
3. Checks user has sufficient credits for the selected provider/model
4. Calls CreditManager.consumeCredits(user, providerFee) on-chain
5. Fetches the agent's linked memories from ContextRegistry
6. For each linked memory, gets the CID from MemoryRegistry
7. Fetches encrypted content from IPFS via `/ipfs/:cid`
8. The frontend has already decrypted and sent the memories in `memoryContext`
9. Assembles system prompt: "You are {agentName}. Your memories:\n{memoryContext joined by separator}"
10. Creates AI SDK stream with the selected provider
11. Pipes SSE events to the response
12. On finish, logs the credit consumption

---

### `GET /chats/:chatId/messages`

**Description:** Gets chat message history. Messages are stored in IPFS (encrypted) — this endpoint fetches them. Returns decrypted content.

**Auth:** Session cookie required

**Params:** `chatId`

**Query params:**
- `page` (optional, default: 1)
- `limit` (optional, default: 50)

**Response:**
```typescript
{
  messages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;               // decrypted content
    timestamp: string;
    provider?: string;             // AI provider used (for assistant messages)
    creditsUsed?: number;
  }>;
  total: number;
  page: number;
  limit: number;
}
```

**Note:** This endpoint returns decrypted content. The messages are stored encrypted in IPFS — the backend fetches, and the frontend provides the decryption key via session. For the initial implementation, messages may be stored locally in the frontend (localStorage/IndexedDB) rather than IPFS, since chat history is less critical to persist cross-device.

---

## 7. Credits

### `GET /credits/balance`

**Description:** Returns the user's current credit balance, total purchased, and total spent.

**Auth:** Session cookie required

**Response:**
```typescript
{
  balance: number;                 // current MC balance
  purchased: number;               // total MC ever purchased
  spent: number;                   // total MC ever spent
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Gets user address from session
3. Calls CreditManager.balanceOf(userAddress)
4. Calls CreditManager.totalPurchased(userAddress)
5. Calls CreditManager.totalSpent(userAddress)
6. Returns the three values

---

### `GET /credits/fees`

**Description:** Returns the fee schedule for all operations.

**Auth:** None (public)

**Response:**
```typescript
{
  registerUser: number;            // MC cost
  createMemory: number;
  updateMemory: number;
  createAgent: number;
  updateAgent: number;
  executeAgent: number;
  linkMemory: number;
}
```

**What it does step-by-step:**
1. Calls CreditManager.getFees() (returns all 7 fee values)
2. Maps them to named fields
3. Returns the fee schedule

---

### `GET /credits/ai-fees`

**Description:** Returns the per-provider/model AI operation costs (configured server-side, not on-chain).

**Auth:** None (public)

**Response:**
```typescript
{
  fees: Array<{
    provider: string;              // e.g., "openai"
    model: string;                 // e.g., "gpt-4o"
    costInMC: number;              // Memory Credits per message
    label: string;                 // e.g., "GPT-4o"
  }>;
}
```

---

### `GET /credits/pricing`

**Description:** Returns the ETH-to-MC pricing configuration.

**Auth:** None (public)

**Response:**
```typescript
{
  isTestnet: boolean;
  treasury: string;                // treasury address
  pricePerCredit: string;          // wei string (e.g., "1000000000000" for 0.000001 ETH)
  minPurchase: string;             // wei string
  maxPurchase: string;             // wei string
}
```

---

## 8. Session Keys

### `POST /session-keys/create`

**Description:** Registers a new session key for the user. The session key is stored in Redis with the granted permissions and expiry. The frontend calls `wallet_grantPermissions` (ERC-7715) first, then sends the result here.

**Auth:** Session cookie required

**Request:**
```typescript
{
  sessionKeyAddress: string;       // the session key's public address
  permissionsContext: string;      // opaque hex from ERC-7715 wallet_grantPermissions
  expiry: number;                  // unix timestamp
  scopes: string[];                // allowed function selectors, e.g., ["consumeCredits(address,uint64)"]
}
```

**Response:**
```typescript
{
  keyId: string;                   // unique ID for this session key
  sessionKeyAddress: string;
  expiry: number;
  scopes: string[];
  grantedAt: number;
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Validates the request body
3. Generates a unique keyId
4. Stores in Redis: `session-key:{address}:{keyId}` → { sessionKeyAddress, permissionsContext, expiry, scopes, grantedAt }
5. Sets Redis TTL to match the expiry
6. Returns the key metadata

---

### `GET /session-keys`

**Description:** Lists all active session keys for the connected user.

**Auth:** Session cookie required

**Response:**
```typescript
{
  keys: Array<{
    keyId: string;
    sessionKeyAddress: string;
    expiry: number;
    scopes: string[];
    grantedAt: number;
    isActive: boolean;             // true if not expired
  }>;
}
```

---

### `GET /session-keys/:keyId`

**Description:** Gets details for a specific session key.

**Auth:** Session cookie required

**Params:** `keyId`

**Response:**
```typescript
{
  keyId: string;
  sessionKeyAddress: string;
  permissionsContext: string;
  expiry: number;
  scopes: string[];
  grantedAt: number;
  isActive: boolean;
}
```

---

### `DELETE /session-keys/:keyId`

**Description:** Revokes a session key. Deletes from Redis. The frontend should also call `wallet_revokePermissions` to revoke on-chain.

**Auth:** Session cookie required

**Params:** `keyId`

**Response:**
```typescript
{
  success: true;
  keyId: string;
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Deletes `session-key:{address}:{keyId}` from Redis
3. Returns success

---

### `POST /session-keys/:keyId/validate`

**Description:** Validates whether a session key is still active and can perform a specific operation. Used by the frontend to check before attempting an operation.

**Auth:** Session cookie required

**Params:** `keyId`

**Request:**
```typescript
{
  operation: string;               // function selector to check, e.g., "consumeCredits(address,uint64)"
}
```

**Response:**
```typescript
{
  valid: boolean;
  keyId: string;
  isActive: boolean;
  hasScope: boolean;               // whether the operation is in the key's scope
  expiry: number;
  remainingSeconds: number;
}
```

---

## 9. Recovery

### `POST /recovery/re-key`

**Description:** Re-keys a data item after wallet recovery. The frontend decrypts K_data with K_recovery (client-side), re-encrypts with K_wallet_new (client-side), and sends the new CID/hash. The backend updates the on-chain metadata. This is called once per data item during recovery.

**Auth:** Session cookie required (new wallet must be authenticated)

**Request:**
```typescript
{
  itemType: "memory" | "agent" | "chat";
  itemId: string;                  // bytes32 hex
  newCid: string;                  // new IPFS CID (re-encrypted content)
  newHash: string;                 // new SHA-256 hash
}
```

**Response:**
```typescript
{
  success: true;
  itemType: string;
  itemId: string;
  newCid: string;
  newHash: string;
  updatedAt: number;
}
```

**What it does step-by-step:**
1. Validates the session cookie (new wallet must be authenticated)
2. Validates the request body
3. Based on itemType:
   - `memory`: calls MemoryRegistry.updateMemory(itemId, newCid, newHash)
   - `agent`: calls AgentRegistry.updateAgent(itemId, newCid, newHash)
   - `chat`: calls ChatRegistry.updateChat(itemId, newCid, newHash)
4. Returns success

**Note:** The frontend is responsible for:
- Deriving K_recovery from the recovery code
- Fetching the old encrypted content from IPFS
- Decrypting with K_recovery
- Generating new K_data or reusing the decrypted K_data
- Re-encrypting with K_wallet_new
- Pinning the new ciphertext to IPFS
- Calling this endpoint for each item that needs re-keying

---

### `POST /recovery/derive`

**Description:** Derives a recovery key from a code and verifies it matches the expected format. Pure computation — no on-chain calls. Used by the frontend for validation before attempting recovery.

**Auth:** Session cookie required

**Request:**
```typescript
{
  recoveryCode: string;            // space-separated 12 words
}
```

**Response:**
```typescript
{
  valid: boolean;                  // whether the code is valid format
  keyHash: string;                 // PBKDF2 hash of the code (for verification, NOT the key itself)
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Splits the recovery code into words
3. Validates: 12 words, all in BIP-39 wordlist
4. Derives K_recovery using PBKDF2
5. Returns a hash for verification (NOT the key — the frontend derives the key locally)

---

## 10. User

### `GET /user/me`

**Description:** Returns the current user's profile from UserRegistry.

**Auth:** Session cookie required

**Response:**
```typescript
{
  address: string;
  username: string | null;
  isRegistered: boolean;
  isActive: boolean;
  totalAgents: number;
  totalMemories: number;
  createdAt: number;
}
```

**What it does step-by-step:**
1. Validates the session cookie
2. Calls UserRegistry.isRegistered(userAddress)
3. If registered, calls UserRegistry.getUsername, UserRegistry.isActive, UserRegistry.getAgentCount, UserRegistry.getMemoryCount
4. Returns the profile

---

### `POST /user/register`

**Description:** Registers a username in UserRegistry. Consumes 0 MC (free).

**Auth:** Session cookie required (must not already be registered)

**Request:**
```typescript
{
  username: string;                // 3-32 characters, alphanumeric + underscores
}
```

**Response:**
```typescript
{
  address: string;
  username: string;
  registeredAt: number;
}
```

---

### `PUT /user/username`

**Description:** Updates the user's username.

**Auth:** Session cookie required (must be registered)

**Request:**
```typescript
{
  username: string;                // new username
}
```

**Response:**
```typescript
{
  address: string;
  username: string;
  updatedAt: number;
}
```

---

## Summary: Endpoint Count by Category

| Category | Endpoints | Protected |
|----------|-----------|-----------|
| Auth | 4 | 3 |
| IPFS | 3 | 3 |
| Memories | 7 | 7 |
| Agents | 6 | 6 |
| Context | 6 | 6 |
| Chats | 6 | 6 |
| Credits | 4 | 1 |
| Session Keys | 5 | 5 |
| Recovery | 2 | 2 |
| User | 3 | 3 |
| **Total** | **46** | **42** |
