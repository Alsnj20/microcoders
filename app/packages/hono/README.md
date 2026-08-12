# MemoryChain Backend (Hono)

Servidor **Hono** (Node.js) que actúa como capa intermedia entre el **frontend Next.js** y la **blockchain** + servicios **off-chain** (IPFS, IA, Redis). Corre en el puerto `3001`.

---

## 1. Qué hace el backend

| Rol | Descripción |
|---|---|
| **Autenticación** | SIWE (challenge → firma → sesión por cookie) |
| **Escrituras on-chain** | Registrar usuario, crear/actualizar/archivar memorias, agentes y chats, enlazar contexto, comprar/consumir créditos, registrar auditoría |
| **Lecturas on-chain** | Saldos, fees, pricing, listados por owner, datos de recursos |
| **Almacenamiento off-chain** | IPFS: pin / retrieve / unpin (los datos cifrados viven aquí) |
| **IA** | `/chat/send` — llama al LLM (Azure AI Foundry, compatible con OpenAI) inyectando memorias enlazadas como contexto |
| **Session keys** | Genera llaves efímeras del usuario y guarda su private key **cifrada** en Redis (para firmar UserOps en producción) |

## 2. Dos modos de operación

El backend decide cómo firmar según `NODE_ENV`:

| | **Dev** (`NODE_ENV` vacío) | **Producción** (`NODE_ENV=production`) |
|---|---|---|
| Quién firma | El **backend** con `DEV_PRIVATE_KEY` (EOA) | El **usuario** a través de su **smart account** (session key) |
| Escrituras | Transacciones EOA normales | **UserOps** → bundler → EntryPoint |
| Gas | Lo paga el backend | Lo paga el smart account del usuario |
| Requisitos | `RPC_URL`, `CHAIN_ID`, `DEV_PRIVATE_KEY`, deployments | Todo lo de dev + `REDIS_URL`, `SESSION_KEY_ENCRYPTION_KEY`, `FACTORY_ADDRESS`, `ENTRY_POINT_ADDRESS`, `BUNDLER_URL` |

> En producción las rutas on-chain se montan igual, pero las **escrituras** resuelven la
> session key activa de cada usuario (en Redis), la descifran y envían una UserOp
> firmada por esa key. Las **lecturas** van directas al RPC.

## 3. Configuración (variables de entorno)

Ver `.env.example`. Las importantes:

| Variable | Uso | Default |
|---|---|---|
| `RPC_URL` | RPC de la red objetivo | `http://localhost:8547` (Nitro) |
| `CHAIN_ID` | Red: `412346` Nitro, `421614` Sepolia, `42161` One | `412346` |
| `DEV_PRIVATE_KEY` | Signer EOA (solo dev) | — |
| `NODE_ENV` | `production` → UserOps | dev |
| `ENTRY_POINT_ADDRESS` | EntryPoint v0.6 | canónico `0x5FF1…` |
| `FACTORY_ADDRESS` | SimpleAccountFactory (requerida en producción) | — |
| `BUNDLER_URL` | Bundler ERC-4337 | `http://localhost:4337` |
| `REDIS_URL` | Session keys (requerida en producción) | — |
| `SESSION_KEY_ENCRYPTION_KEY` | AES-GCM 64 hex para cifrar private keys (requerida en producción) | — |
| `IPFS_API_URL` | API de Kubo | `http://localhost:5001` |
| `CORS_ORIGIN` | Origen permitido | `http://localhost:3000` |
| `ENABLE_DEV_WALLET_AUTH` | Bypass de SIWE para dev (nunca en prod) | `false` |
| `FOUNDRY_OPENAI_URL` / `FOUNDRY_KEY` | LLM (chat) | — |

**Plantillas para alternar entorno** (`cp .env.X .env`):
- `.env.nitro` — dev local (backend firma)
- `.env.sepolia` — testnet, modo producción (usuario firma)

## 4. Estructura del código

```
packages/hono/src/
├── index.ts              # App + middleware (sesión, CORS) + buildRegistries() (dev/prod)
├── routes/               # HTTP endpoints
│   ├── auth.ts           # SIWE
│   ├── session-keys.ts   # Gestión de session keys
│   ├── ipfs.ts           # Pin/retrieve/unpin
│   ├── memories.ts  agents.ts  chat.ts  context.ts
│   ├── credits.ts  user.ts  audit.ts
├── lib/                  # Lógica
│   ├── contracts.ts      # Adaptadores de contratos (dev EOA + producción UserOp)
│   ├── userop-builder.ts # Construye/firma/envía UserOps v0.6
│   ├── smart-account.ts  # factory.getAddress, initCode, isDeployed
│   ├── session-key-crypto.ts  # AES-GCM
│   ├── session-keys.ts   # Store Redis
│   ├── ipfs.ts  prices.ts  foundry.ts
├── types/                # Tipos (contracts, session, bundler)
└── __tests__/            # Vitest
```

## 5. Endpoints (qué recibe y qué devuelve)

Todas las rutas excepto `/ipfs` requieren sesión (cookie `session=` o header `X-Dev-Wallet` en dev).

### `/auth`
| Método/Ruta | Recibe | Hace | Devuelve |
|---|---|---|---|
| `GET /auth/challenge` | `?address=` | Genera nonce + mensaje SIWE | `{ nonce, message, expiresAt }` |
| `POST /auth/verify` | `{ message, signature, address }` | Verifica firma, crea sesión + cookie | `{ address, chainId, username }` |
| `GET /auth/session` | — | Lee la sesión | sesión o `401` |
| `DELETE /auth/session` | — | Borra sesión y cookie | `{ success: true }` |

### `/session-keys`
| Método/Ruta | Recibe | Hace | Devuelve |
|---|---|---|---|
| `POST /session-keys/generate` | `{ permissionsContext, expiry, scopes }` | Genera keypair, **guarda la private key cifrada** en Redis | `{ keyId, sessionKeyAddress, privateKey, expiry, scopes }` |
| `POST /session-keys` | `{ sessionKeyAddress, permissionsContext, expiry, scopes }` | Registra una key existente | `{ keyId, … }` |
| `GET /session-keys` | — | Lista keys del usuario | `{ keys: [...] }` |
| `GET /session-keys/:keyId` | — | Detalle de una key | key o `404` |
| `DELETE /session-keys/:keyId` | — | Revoca | `{ success: true }` |
| `POST /session-keys/:keyId/validate` | `{ operation }` | Valida activa + scope | `{ valid, isActive, hasScope, … }` |

### `/ipfs` (sin sesión)
| Método/Ruta | Recibe | Devuelve |
|---|---|---|
| `POST /ipfs/pin` | `{ data (base64), name, mimeType? }` | `{ cid, hash, size, pinnedAt }` |
| `GET /ipfs/:cid` | — | `{ data (base64), size }` o `404` |
| `DELETE /ipfs/:cid` | — | `{ success: true }` o `500` |

### `/memories` `/agents` `/chat` `/context`
| Método/Ruta | Recibe | Hace |
|---|---|---|
| `POST /memories/create` | `{ name, description?, cid, hash, memoryType, visibility }` | Crea memoria on-chain (cobra créditos) |
| `PUT /memories/:id` | `{ cid, hash }` | Actualiza (nueva versión) |
| `POST /memories/:id/archive` / `restore` | — | Soft delete / restaurar |
| `GET /memories` / `GET /memories/:id` | — | Listar / detalle |
| `POST /chat/create` | `{ name }` | Crea chat on-chain |
| `POST /chat/send` | `{ message, agentId?, chatId?, model?, systemPrompt?, memories?, history? }` | Llama al LLM (sin on-chain) |
| `GET /chat/list` / `GET /chat/:id` / `DELETE /chat/:id` | — | Listar / detalle / archivar |
| `POST /context/link` | `{ agentId, memoryId, priority }` | Enlaza memoria↔agente |
| `DELETE /context/unlink` | `{ agentId, memoryId }` | Desenlaza |

### `/credits` `/user` `/audit`
| Método/Ruta | Recibe | Devuelve |
|---|---|---|
| `GET /credits/balance` | — | `{ balance, purchased, spent }` |
| `GET /credits/fees` / `pricing` / `ai-fees` | — | Fees / pricing / costo de modelos |
| `POST /credits/buy` | `{ amount }` | Compra créditos (calcula ETH exacto y paga) |
| `GET /user/me` | — | Perfil del usuario |
| `POST /user/register` | `{ username }` | Registra usuario on-chain |
| `PUT /user/username` | `{ username }` | Cambia username |
| `GET /audit/...` | — | Historial / eventos de auditoría |

## 6. Cómo se conecta (diagrama)

```
┌─────────────┐  HTTP (cookies)   ┌──────────────────────────┐
│  Frontend   │ ────────────────► │  Hono backend (:3001)    │
│  (Next.js)  │ ◄──────────────── │  auth · session-keys ·   │
└─────────────┘   JSON            │  ipfs · memories · chat  │
                                  │  credits · user · audit  │
                                  └──────────┬───────────────┘
                                             │
              ┌──────────────┬───────────────┼──────────────┬──────────────┐
              ▼              ▼               ▼              ▼              ▼
          Contratos     Bundler (4337)      IPFS        Redis          LLM (Foundry)
          (RPC/CHAIN_ID)  (BUNDLER_URL)  (5001)       (6379)      (FOUNDRY_*)
          deployments/   EntryPoint +    datos       session     chat/send
          <red>_<id>.json smart account   cifrados    keys
```

- **Dev**: las escrituras van por RPC firmadas con `DEV_PRIVATE_KEY`.
- **Producción**: las escrituras van por el **bundler** como UserOps firmadas con la session key del usuario (el gas lo paga su smart account).

## 7. Cómo ejecutarlo

```bash
# desde app/
pnpm hono:dev        # dev con watch (:3001)
pnpm hono:start      # producción (node dist/index.js)
pnpm hono:test       # vitest
```

> Los tests de `/ipfs` requieren el contenedor de IPFS corriendo (`docker compose up -d` en `app/`).

## 8. Notas

- **Frontend ↔ backend**: el frontend usa `hono/client` (`services/api/client.ts`) con cookies `credentials: include`.
- **Dev wallet auth**: con `ENABLE_DEV_WALLET_AUTH=true`, el header `X-Dev-Wallet` crea sesión sin SIWE (solo desarrollo).
- **Producción exige**: Redis corriendo, `deployments/<red>_<chainId>_latest.json` (tras `pnpm run deploy:contracts --network X`), `FACTORY_ADDRESS` (tras `./script/deploy.sh sepolia`), y `SESSION_KEY_ENCRYPTION_KEY`. Si falta algo, el backend no arranca (fail-fast).
- **Eventos**: los contratos emiten eventos on-chain; el backend aún no los indexa (ver `CHANGELOG.md`).
