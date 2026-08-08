# Frontend Implementation Plan — MemoryChain (Post-Backend)

## 1. Overview

This plan covers the frontend changes required **after** the Hono backend is implemented. The frontend currently has partially built UI components (memories, agents, chat, pet) but relies on mock data and direct contract reads. The backend introduces:

- Encrypted IPFS storage/retrieval
- AI provider proxying with memory injection
- Session key management for gasless operations
- Credit consumption before AI calls
- Server-side session auth (SIWE)

All changes are in `packages/nextjs/`.

## 2. New Dependencies

```bash
pnpm add @hono/zod-validator zod  # if not already present (likely already via scaffold)
pnpm add @tanstack/react-query     # if not already present for server state
```

No new major dependencies — the existing stack (wagmi, viem, RainbowKit, assistant-ui, zustand) handles everything.

## 3. Module Structure Changes

```
packages/nextjs/
├── services/
│   ├── api/
│   │   ├── client.ts              # Hono RPC client (type-safe)
│   │   ├── auth.ts                # SIWE challenge/verify calls
│   │   ├── ipfs.ts                # IPFS pin/retrieve via backend
│   │   ├── memories.ts            # Memory CRUD via backend
│   │   ├── agents.ts              # Agent CRUD via backend
│   │   ├── chats.ts               # Chat CRUD + AI streaming via backend
│   │   ├── context.ts             # Agent<->Memory linking via backend
│   │   ├── credits.ts             # Credit balance + fee queries
│   │   └── session-keys.ts        # Session key grant/revoke
│   ├── crypto/
│   │   ├── envelope.ts            # Client-side envelope encryption/decryption
│   │   ├── keys.ts                # Key derivation (K_wallet, K_recovery, K_data)
│   │   └── recovery.ts            # Recovery code generation + validation
│   └── store/
│       └── store.ts               # Updated Zustand store (session, user state)
├── src/modules/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── ConnectWallet.tsx  # RainbowKit connect + SIWE sign
│   │   │   ├── RecoverySetup.tsx  # Recovery code display + backup
│   │   │   └── SessionKeyGrant.tsx # ERC-7715 permission request
│   │   └── hooks/
│   │       ├── useSiwe.ts         # SIWE session management
│   │       └── useSessionKey.ts   # Session key lifecycle
│   ├── memories/
│   │   └── hooks/
│   │       └── use-memories.ts    # Updated: encrypted CRUD via backend
│   ├── agents/
│   │   └── hooks/
│   │       └── use-agents.ts      # Updated: encrypted CRUD via backend
│   ├── chat/
│   │   └── hooks/
│   │       └── use-chat.ts        # Updated: AI streaming via backend
│   └── home/
│       └── hooks/
│           └── use-dashboard.ts   # Updated: real data from backend
```

## 4. Encryption Layer (`services/crypto/`)

### 4.1 Key Derivation (`keys.ts`)

```typescript
// K_wallet: derived from wallet signature
async function deriveKWallet(signer: Signer): Promise<Uint8Array> {
  const signature = await signer.signMessage('Sign to unlock dApp key');
  // PBKDF2 or Argon2 on the signature hash
  return pbkdf2(signature, 'memorychain-session', 100000, 32, 'sha256');
}

// K_recovery: derived from recovery code
async function deriveKRecovery(recoveryCode: string): Promise<Uint8Array> {
  return pbkdf2(recoveryCode, 'memorychain-recovery', 100000, 32, 'sha256');
}

// K_data: random AES-256 key
function generateKData(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}
```

### 4.2 Envelope Encryption (`envelope.ts`)

```typescript
// Encrypt data with K_data
async function encryptData(data: string, kData: Uint8Array): Promise<Uint8Array> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', kData, 'AES-GCM', false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(data));
  return concat(iv, new Uint8Array(encrypted));
}

// Decrypt data with K_data
async function decryptData(ciphertext: Uint8Array, kData: Uint8Array): Promise<string> {
  const iv = ciphertext.slice(0, 12);
  const data = ciphertext.slice(12);
  const key = await crypto.subtle.importKey('raw', kData, 'AES-GCM', false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return decoder.decode(decrypted);
}

// Create wallet envelope: encrypt K_data with K_wallet
async function createWalletEnvelope(kData: Uint8Array, kWallet: Uint8Array): Promise<Uint8Array> {
  return encryptData(arrayBufferToBase64(kData), kWallet);
}

// Create recovery envelope: encrypt K_data with K_recovery
async function createRecoveryEnvelope(kData: Uint8Array, kRecovery: Uint8Array): Promise<Uint8Array> {
  return encryptData(arrayBufferToBase64(kData), kRecovery);
}
```

### 4.3 Recovery Code Generation (`recovery.ts`)

```typescript
// Generate 12-word recovery code (BIP-39 wordlist subset)
function generateRecoveryCode(): string[] {
  const words = [...]; // 2048 words (BIP-39)
  return Array.from({ length: 12 }, () => words[crypto.getRandomValues(new Uint8Array(1))[0] % 2048]);
}

// Validate recovery code format
function isValidRecoveryCode(words: string[]): boolean {
  return words.length === 12 && words.every(w => WORD_SET.has(w));
}
```

## 5. API Client Layer (`services/api/`)

### 5.1 Type-Safe Hono Client (`client.ts`)

```typescript
import { hc } from 'hono/client';
import type { AppType } from '@ss/hono'; // import the Hono app type

const api = hc<AppType>('http://localhost:3001', {
  headers: { 'Content-Type': 'application/json' },
});

// Attach session cookie from browser
// iron-session sets httpOnly cookie automatically
```

### 5.2 Auth Flow (`auth.ts`)

```typescript
// 1. Get SIWE challenge
const challenge = await api.auth.challenge.$get();

// 2. Sign with wallet
const signature = await walletClient.signMessage({ message: challenge.message });

// 3. Verify and create session
await api.auth.verify.$post({
  json: { message: challenge.message, signature, address },
});

// 4. Session cookie is now set — all subsequent requests are authenticated
```

### 5.3 Memory Operations (`memories.ts`)

```typescript
// Create memory (encrypted)
async function createMemory(memory: CreateMemoryInput) {
  // 1. Generate K_data
  const kData = generateKData();

  // 2. Encrypt content with K_data
  const ciphertext = await encryptData(memory.content, kData);

  // 3. Create envelopes
  const walletEnvelope = await createWalletEnvelope(kData, session.kWallet);
  const recoveryEnvelope = await createRecoveryEnvelope(kData, session.kRecovery);

  // 4. Upload encrypted blob to IPFS via backend
  const { cid, hash } = await api.ipfs.pin.$post({
    json: { data: arrayBufferToBase64(ciphertext), name: memory.title },
  });

  // 5. Create on-chain memory via backend (session key execution)
  const result = await api.memories.create.$post({
    json: {
      cid,
      hash,
      name: memory.title,
      memoryType: memory.type,
      visibility: memory.visibility,
      walletEnvelope: arrayBufferToBase64(walletEnvelope),
      recoveryEnvelope: arrayBufferToBase64(recoveryEnvelope),
    },
  });

  return result;
}

// Read memory (decrypted)
async function readMemory(memoryId: string) {
  // 1. Get memory metadata from backend
  const meta = await api.memories[':id'].$get({ param: { id: memoryId } });

  // 2. Fetch encrypted content from IPFS via backend
  const encrypted = await api.ipfs[':cid'].$get({ param: { cid: meta.currentCid } });

  // 3. Decrypt client-side with K_wallet
  const plaintext = await decryptData(base64ToArrayBuffer(encrypted.data), session.kWallet);

  return { ...meta, content: plaintext };
}
```

### 5.4 Chat Streaming (`chats.ts`)

```typescript
// Send message + stream AI response
async function sendMessage(chatId: string, message: string, agentId: string, provider: string) {
  // 1. Fetch linked memories for this agent
  const linkedMemories = await api.context.agentMemories.$get({
    query: { agentId },
  });

  // 2. Decrypt all linked memories client-side
  const decryptedMemories = await Promise.all(
    linkedMemories.map(async (m) => {
      const encrypted = await api.ipfs[':cid'].$get({ param: { cid: m.cid } });
      return decryptData(base64ToArrayBuffer(encrypted.data), session.kWallet);
    }),
  );

  // 3. Send to backend with decrypted memory context
  const response = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({
      content: message,
      agentId,
      provider,
      memoryContext: decryptedMemories, // full plaintext memories
    }),
  });

  // 4. Read SSE stream
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // Parse SSE events, yield to assistant-ui
    yield parseSSEEvents(chunk);
  }
}
```

## 6. Updated Hooks

### 6.1 `use-memories.ts` — Encrypted CRUD

Replace mock data with backend API calls:

```typescript
export function useMemories() {
  const { data: memories, mutate } = useSWR('/api/memories', fetcher);

  const createMemory = async (input: CreateMemoryInput) => {
    const result = await api.memories.create.$post({ json: input });
    mutate(); // revalidate
    return result;
  };

  const readMemory = async (id: string) => {
    return readMemory(id); // decrypt client-side
  };

  const updateMemory = async (id: string, input: UpdateMemoryInput) => {
    // Same as create but re-encrypts with same K_data, new CID
    await api.memories[':id'].$put({ param: { id }, json: input });
    mutate();
  };

  return { memories, createMemory, readMemory, updateMemory };
}
```

### 6.2 `use-chat.ts` — AI Streaming

Replace mock responses with backend SSE streaming:

```typescript
export function useChat(chatId: string, agentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = async (content: string) => {
    setIsStreaming(true);
    const userMsg = { id: nanoid(), role: 'user', content, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);

    // Stream AI response
    const stream = sendMessage(chatId, content, agentId, selectedProvider);
    let assistantContent = '';

    for await (const event of stream) {
      if (event.type === 'text-delta') {
        assistantContent += event.delta;
        setMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: assistantContent };
          } else {
            updated.push({ id: nanoid(), role: 'assistant', content: assistantContent, timestamp: new Date().toISOString() });
          }
          return updated;
        });
      }
    }

    setIsStreaming(false);
  };

  return { messages, sendMessage, isStreaming };
}
```

### 6.3 `useSessionKey.ts` — Session Key Lifecycle

```typescript
export function useSessionKey() {
  const [sessionKey, setSessionKey] = useState<SessionKey | null>(null);

  const grantSessionKey = async () => {
    // 1. Generate session key pair locally
    const sessionKeyPair = await generateSessionKeyPair();

    // 2. Request ERC-7715 permission from wallet
    const result = await window.ethereum.request({
      method: 'wallet_grantPermissions',
      params: [{
        chainId: '0x62697', // 412346 in hex
        expiry: Math.floor(Date.now() / 1000) + 86400, // 24h
        signer: { type: 'key', data: { id: sessionKeyPair.publicKey } },
        permissions: MEMORYCHAIN_PERMISSIONS,
      }],
    });

    // 3. Send to backend for storage
    await api.sessionKeys.create.$post({
      json: {
        sessionKeyAddress: sessionKeyPair.address,
        permissionsContext: result.permissionsContext,
        expiry: result.expiry,
      },
    });

    setSessionKey(result);
  };

  const revokeSessionKey = async () => {
    await window.ethereum.request({
      method: 'wallet_revokePermissions',
      params: [{ id: sessionKey.id }],
    });
    await api.sessionKeys[':id'].$delete({ param: { id: sessionKey.id } });
    setSessionKey(null);
  };

  return { sessionKey, grantSessionKey, revokeSessionKey };
}
```

## 7. Updated Pages/Routes

### 7.1 Onboarding Flow

```
/connect → Connect wallet → SIWE sign → Recovery code setup → Session key grant → Dashboard
```

Components:
- `ConnectWallet` — RainbowKit connect button
- `SiweSign` — Sign SIWE message to authenticate
- `RecoverySetup` — Display 12-word recovery code, require user to confirm they saved it
- `SessionKeyGrant` — Request ERC-7715 permissions for 24h session

### 7.2 Dashboard (Home)

Replace mock data with real contract + backend data:
- Credit balance from `GET /api/credits/balance`
- Memory count from `GET /api/memories` (list, not decrypt)
- Agent count from `GET /api/agents` (list, not decrypt)
- Recent chat activity from `GET /api/chats`

### 7.3 Memory Module

- `use-memories.ts` — Encrypted CRUD via backend
- `MemoryCard.tsx` — Shows name, type, CID (not content — content decrypted on open)
- `MemoryEditor.tsx` — Opens memory, decrypts content client-side, allows editing
- `MemoryCreate.tsx` — Create form, encrypts + pins to IPFS

### 7.4 Agent Module

- `use-agents.ts` — Encrypted CRUD via backend
- `AgentCard.tsx` — Shows name, description, linked memory count
- `AgentEditor.tsx` — Edit agent blueprint (encrypted on IPFS)
- `AgentMemoryLink.tsx` — Link/unlink memories to agents via ContextRegistry

### 7.5 Chat Module

- `use-chat.ts` — AI streaming via backend SSE
- `Thread.tsx` — Uses assistant-ui, connects to backend streaming
- `ChatList.tsx` — Lists chats from on-chain registry
- `ChatCreate.tsx` — New chat (select agent, name it)

## 8. Provider Selection

Add provider/model selector to chat UI:

```typescript
const PROVIDERS = [
  { id: 'openai:gpt-4o', name: 'GPT-4o', cost: 2 },
  { id: 'openai:gpt-4o-mini', name: 'GPT-4o Mini', cost: 1 },
  { id: 'anthropic:claude-sonnet-4-20250514', name: 'Claude Sonnet', cost: 3 },
  { id: 'anthropic:claude-haiku', name: 'Claude Haiku', cost: 1 },
  { id: 'google:gemini-2.0-flash', name: 'Gemini Flash', cost: 1 },
  { id: 'google:gemini-2.5-pro', name: 'Gemini Pro', cost: 2 },
];
```

User selects provider per chat or per message. Credits cost shown before sending.

## 9. State Management

### Zustand Store (Updated)

```typescript
type GlobalState = {
  // Existing
  targetNetwork: ChainWithAttributes;

  // New: Session
  session: {
    address: string | null;
    chainId: number | null;
    username: string | null;
    isAuthenticated: boolean;
  };
  setSession: (session: GlobalState['session']) => void;

  // New: Session Key
  sessionKey: {
    id: string | null;
    address: string | null;
    expiry: number | null;
    isActive: boolean;
  };
  setSessionKey: (key: GlobalState['sessionKey']) => void;

  // New: Provider selection
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;

  // New: Credit balance (cached)
  creditBalance: number;
  setCreditBalance: (balance: number) => void;
};
```

## 10. Key Tradeoffs

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Memory decryption | Client-side only | Security — backend never sees plaintext at rest |
| Memory injection for AI | Frontend decrypts + sends in request | Same principle — decryption is client-side |
| Session state | Zustand (existing) | Already in use, lightweight, no migration needed |
| Server state | SWR or React Query | Cache + revalidation for contract/backend data |
| Streaming | SSE via fetch API | Compatible with assistant-ui, no WebSocket overhead |
| Session keys | ERC-7715 via wallet provider | Standard, wallet-enforced, scoped |
| Onboarding | Multi-step wizard | Recovery code setup is critical — can't skip |

## 11. Implementation Order

### Phase 1: Auth & Session (Days 1-2)
1. SIWE challenge/verify flow
2. Session cookie management
3. ConnectWallet + SiweSign components
4. Zustand store updates

### Phase 2: Encryption Layer (Days 3-4)
5. Key derivation (K_wallet, K_recovery, K_data)
6. Envelope encryption/decryption
7. Recovery code generation
8. IPFS pin/retrieve via backend

### Phase 3: Memory CRUD (Days 5-6)
9. Encrypted create/read/update via backend
10. MemoryCard, MemoryEditor, MemoryCreate components
11. use-memories.ts hook

### Phase 4: Agent CRUD (Days 7-8)
12. Encrypted create/read/update via backend
13. AgentCard, AgentEditor, AgentMemoryLink components
14. use-agents.ts hook

### Phase 5: Chat & AI (Days 9-11)
15. Chat CRUD via backend
16. AI streaming via SSE
17. Provider selector component
18. use-chat.ts hook
19. assistant-ui integration

### Phase 6: Session Keys (Days 12-13)
20. ERC-7715 permission request flow
21. SessionKeyGrant component
22. useSessionKey.ts hook

### Phase 7: Recovery & Polish (Days 14-15)
23. Recovery code setup flow
24. Recovery re-keying flow
25. Dashboard real data
26. Error handling + loading states
