# Arquitectura técnica — MemoryChain (Microcoders)

Stack real: **Next.js** + RainbowKit/wagmi · **Hono** · **Redis** · **IPFS Kubo** · **Azure AI Foundry** · **Arbitrum Stylus (Rust)** · **ERC-4337 v0.6 + bundler Alto**.

## 1. Contratos desplegados (Arbitrum Sepolia · chain 421614)

### 1.1. Contratos Stylus

| Contrato | Dirección |
|---|---|
| CreditManager | `0x671f90db2642a3ac78389f701431561921bb47fb` |
| UserRegistry | `0x0b5b3c00965f7fe3f350bad3c49fdc989f71fbda` |
| MemoryRegistry | `0x64cbfbda8218cf9d70974565cdb854ff608eec02` |
| AgentRegistry | `0x0f863dc5615b771b4e7bc0510d34f8077a5b0753` |
| ContextRegistry | `0xa26daec24bc74cd36e4cab9b2ade0256adcda59f` |
| AuditRegistry | `0xe2670b83bb20801759091931c5f14fe0aed2dd63` |
| ChatRegistry | `0xc0f809540de925a2a9cd3334c095a3b5cb8daebd` |

> Fuente de verdad: `app/packages/stylus/deployments/arbitrumSepolia_421614_latest.json`.
> El `CreditManager` fue **re-desplegado** (WASM corregido para `msg_value` en llamadas
> contrato→contrato) y re-inicializado (`initializeNetwork(isTestnet=true, treasury, price=1e14)`);
> los 4 consumidores (Memory/Agent/Chat/Context) fueron re-autorizados y cada registry
> re-apuntado con `setCreditManager`.

### 1.2. Account Abstraction (ERC-4337 v0.6)

| Contrato | Dirección |
|---|---|
| EntryPoint | `0x78fea18e70c9372df8f52a60f8b3f81c79c87af5` |
| SimpleAccountFactory | `0xe9606ba1da696cd0fd14a4d195f50aecec2f1596` |

> Desplegado desde `app/packages/stylus/contracts/aa` (lib `account-abstraction`
> pinned a v0.6.0). Bundler **Alto** corriendo en Docker (`memorychain-alto-sepolia`)
> apuntando a `https://arbitrum-sepolia-rpc.publicnode.com` con `ALTO_SAFE_MODE=false`.

## 2. Detalles de implementación

### 2.1. Escritura on-chain

En producción (`NODE_ENV=production`) **todas las escrituras son UserOps ERC-4337**:
el frontend lee `UserRegistry.isRegistered` sobre la **smart account** del usuario
(no la wallet), y cada write se firma con la **session key** (guardada AES-GCM cifrada
en Redis) y se envía al bundler. El gas lo paga el **smart account** del usuario.

### 2.2. Cifrado client-side

El contenido se cifra con AES-GCM usando `kData` (por recurso) envuelta con `kWallet`
derivada de la firma SIWE (PBKDF2). El estado global se gestiona con Zustand. El
contenido cifrado se sube a IPFS; en cadena solo se almacenan CID y hash.

**Títulos/metadata en IPFS**: al crear/editar una memoria o un agente, el payload
encriptado de IPFS incluye `title`/`name` (+ `description` + `content`). El frontend
resuelve el título de **todos** los listados y modales desde IPFS
(`resolveMemoryTitleSafe` / `resolveAgentNameFromIpfs`), con fallback al nombre on-chain
solo cuando no hay `kWallet` o el CID es un placeholder (`dev-`/`chat-export-`).

### 2.3. Rutas del backend Hono

`/auth` (SIWE) · `/session-keys` (Redis) · `/ipfs` (Kubo) · `/memories` · `/agents` · `/context` · `/credits` · `/user` · `/audit` · `/chat` (Azure AI Foundry).

### 2.4. Costos de créditos

- Registrar usuario: 0
- Crear memoria: 1
- Actualizar memoria: 1
- Crear agente: 5
- Actualizar agente: 2
- Ejecutar agente: 2
- Vincular memoria: 1
- Crear chat: 1
- Actualizar chat: 1

## 3. Diagrama de arquitectura

![arch](/docs/img/arch.png)

## 4. Resumen de responsabilidades por capa

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| **Frontend** | Next.js + RainbowKit/wagmi | UX, onboarding, cifrado client-side, pin IPFS, consumo de API |
| **Backend** | Hono + viem + Redis + Kubo + Azure AI Foundry | Auth SIWE, session keys, UserOps, inferencia IA, proxy IPFS |
| **Web3** | Arbitrum Stylus (Rust) + ERC-4337 | Propiedad, integridad, versionado, créditos y auditoría |
