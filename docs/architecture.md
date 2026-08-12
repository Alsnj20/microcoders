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

![arch](/docs/img/arch.png)

## 4. Resumen de responsabilidades por capa

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| **Frontend** | Next.js + RainbowKit/wagmi | UX, onboarding, cifrado client-side, pin IPFS, consumo de API |
| **Backend** | Hono + viem + Redis + Kubo + Azure AI Foundry | Auth SIWE, session keys, proxy de transacciones, inferencia IA, proxy IPFS |
| **Web3** | Arbitrum Stylus (Rust) | Propiedad, integridad, versionado, créditos y auditoría |
