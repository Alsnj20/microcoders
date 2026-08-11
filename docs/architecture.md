# Arquitectura técnica — MemoryChain (Microcoders)

Stack real: **Next.js** + RainbowKit/wagmi · **Hono** · **Redis** · **IPFS Kubo** · **Azure AI Foundry** · **Arbitrum Stylus (Rust)**.

## 1. Contratos desplegados (Arbitrum Sepolia · chain 421614)

| Contrato | Dirección |
|---|---|
| CreditManager | `0x6386c0c8e6f414cf5d65572c2e59a29ca2597938` |
| UserRegistry | `0x51941317d2840f54ca781e69edd8ff058fb84501` |
| MemoryRegistry | `0x8a70347d6f57174b687684b27942535b03620c0b` |
| AgentRegistry | `0xeb0613bfe0a392d21801c6352fa48055cd922fae` |
| ContextRegistry | `0xecf7271f05a963305d747346d05d9a7b928fcaf6` |
| AuditRegistry | `0x00fc038b109f6d938f7f4b1dfe8d0d2dee64ddd3` |
| ChatRegistry | `0x47b8399a8a3ad9665e4257904f99eafe043c4f50` |

## 2. Detalles de implementación

### 2.1. Escritura on-chain

El frontend únicamente lee `UserRegistry.isRegistered`; todos los writes los firma el backend a través de los adapters viem con `DEV_PRIVATE_KEY`. Los registries consumen créditos mediante `CreditManager.consumeCreditsForOp` y `buyCredits` transfiere ETH exacto al Treasury.

### 2.2. Cifrado client-side

El contenido se cifra con AES-GCM usando `kData` (por recurso) envuelta con `kWallet` derivada de la firma SIWE (PBKDF2). El estado global se gestiona con Zustand. El contenido cifrado se sube a IPFS; en cadena solo se almacenan CID y hash.

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

```mermaid
flowchart LR
    wallet@{ img: "img/metamask.webp", label: "Wallet", pos: "b", h: 44, constraint: "on" }

    subgraph FRONT["Capa 1 · Frontend Next.js"]
        ui@{ img: "img/app.png", label: "App Next.js", pos: "b", h: 44, constraint: "on" }
        apiclient@{ img: "img/api-client.png", label: "API Client hc", pos: "b", h: 44, constraint: "on" }
        crypto@{ img: "img/crypto-aes.webp", label: "Crypto AES-GCM", pos: "b", h: 44, constraint: "on" }
        ipfsclient@{ img: "img/ipfs.png", label: "IPFS Client", pos: "b", h: 44, constraint: "on" }
    end

    subgraph BACK["Capa 2 · Backend Hono"]
        hono@{ img: "img/hono.png", label: "Hono API", pos: "b", h: 44, constraint: "on" }
        viem@{ img: "img/key.png", label: "Adapters viem signer", pos: "b", h: 44, constraint: "on" }
        redis@{ img: "img/redis.png", label: "Redis", pos: "b", h: 44, constraint: "on" }
        ai@{ img: "img/azure-ai.png", label: "Azure AI Foundry", pos: "b", h: 44, constraint: "on" }
        kubo@{ img: "img/ipfs.png", label: "IPFS Kubo", pos: "b", h: 44, constraint: "on" }
    end

    subgraph CHAIN["Capa 3 · Web3 Arbitrum Stylus"]
        user_reg@{ img: "img/contract.png", label: "UserRegistry", pos: "b", h: 44, constraint: "on" }
        mem@{ img: "img/contract.png", label: "MemoryRegistry", pos: "b", h: 44, constraint: "on" }
        agent@{ img: "img/contract.png", label: "AgentRegistry", pos: "b", h: 44, constraint: "on" }
        ctx@{ img: "img/contract.png", label: "ContextRegistry", pos: "b", h: 44, constraint: "on" }
        credits@{ img: "img/contract.png", label: "CreditManager", pos: "b", h: 44, constraint: "on" }
        audit@{ img: "img/contract.png", label: "AuditRegistry", pos: "b", h: 44, constraint: "on" }
        chat_reg@{ img: "img/contract.png", label: "ChatRegistry", pos: "b", h: 44, constraint: "on" }
        treasury@{ img: "img/treasury.png", label: "Treasury", pos: "b", h: 44, constraint: "on" }
    end

    wallet --> ui
    ui --> apiclient
    ui --> crypto
    ui --> ipfsclient
    ipfsclient --> kubo
    apiclient --> hono
    apiclient --> user_reg
    hono --> redis
    hono --> ai
    hono --> kubo
    hono --> viem
    viem --> user_reg
    viem --> mem
    viem --> agent
    viem --> ctx
    viem --> credits
    viem --> audit
    viem --> chat_reg
    mem --> credits
    agent --> credits
    ctx --> credits
    chat_reg --> credits
    mem --> user_reg
    agent --> user_reg
    chat_reg --> user_reg
    ctx <--> mem
    ctx <--> agent
    credits --> treasury

    style FRONT fill:#e3f2fd,stroke:#90caf9,color:#1565c0
    style BACK fill:#e8f5e9,stroke:#a5d6a7,color:#2e7d32
    style CHAIN fill:#fff3e0,stroke:#ffcc80,color:#e65100

    classDef imgNode stroke:none, fill:none, stroke-width:0
    class wallet,ui,apiclient,crypto,ipfsclient,hono,viem,redis,ai,kubo,user_reg,mem,agent,ctx,credits,audit,chat_reg,treasury imgNode
```

## 4. Resumen de responsabilidades por capa

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| **Frontend** | Next.js + RainbowKit/wagmi | UX, onboarding, cifrado client-side, pin IPFS, consumo de API |
| **Backend** | Hono + viem + Redis + Kubo + Azure AI Foundry | Auth SIWE, session keys, proxy de transacciones, inferencia IA, proxy IPFS |
| **Web3** | Arbitrum Stylus (Rust) | Propiedad, integridad, versionado, créditos y auditoría |
