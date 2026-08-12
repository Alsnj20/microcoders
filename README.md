# 🧠 MemoryChain

> **El protocolo descentralizado para la propiedad del conocimiento utilizado por agentes de Inteligencia Artificial.**

MemoryChain es un protocolo construido sobre **Arbitrum Stylus** que permite a los usuarios ser propietarios de su conocimiento personal y reutilizarlo entre múltiples agentes de IA de forma segura, verificable e interoperable.

En lugar de mantener la memoria dentro de plataformas cerradas, MemoryChain separa el almacenamiento de datos de la capa de confianza. La información privada permanece cifrada fuera de la blockchain, mientras que Arbitrum garantiza la propiedad, la integridad, el versionado y la trazabilidad de cada recurso.

---

# 🚨 Problema

Actualmente los asistentes de Inteligencia Artificial presentan varias limitaciones:
- El usuario no es propietario de su memoria.
- El conocimiento permanece encerrado dentro de una plataforma.
- No existe interoperabilidad entre distintos agentes.
- No existe evidencia criptográfica de que una memoria no haya sido modificada.
- Cada nuevo agente comienza sin conocer el contexto del usuario.

Como consecuencia, el conocimiento termina fragmentado entre diferentes aplicaciones.

---

# 💡 Solución
MemoryChain introduce un protocolo descentralizado donde el usuario es propietario de:
- Su conocimiento personal.
- Sus agentes de IA.
- Las relaciones entre ambos.

Cada usuario puede crear agentes especializados y decidir qué conocimiento utilizará cada uno.

La blockchain únicamente registra información verificable.
Toda la información privada permanece cifrada fuera de la cadena.

---

# 🎯 Objetivos

- Dar al usuario el control sobre su conocimiento.
- Permitir que múltiples agentes compartan el mismo contexto.
- Garantizar la integridad mediante hashes criptográficos.
- Mantener un historial verificable de cambios.
- Facilitar la interoperabilidad entre distintos modelos de IA.
- Reducir la dependencia de plataformas centralizadas.

---

# 🏗 Arquitectura

```
                     Wallet
                        │
                 UserRegistry
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
 MemoryRegistry    AgentRegistry    ChatRegistry
        │               │               │
        └───────┬───────┴───────┬───────┘
                ▼               ▼
         ContextRegistry  (relaciones N:M)
                │
                ▼
         CreditManager ──► ETH Treasury

   AuditRegistry — historial verificable (independiente)
```

> 📐 Diagramas técnicos detallados (capa web3, backend, frontend, flujo del usuario y vista de 3 capas) en Mermaid: **[docs/architecture.md](docs/architecture.md)**

---

# 🌐 Componentes Off-chain

- FastAPI
- PostgreSQL + pgvector
- IPFS
- Flowise
- OpenAI
- Claude

---

# 📋 Requerimientos Funcionales

## Gestión de Usuarios
El sistema debe permitir:
- Registrar usuarios mediante una wallet.
- Consultar la información del usuario (username).
- Mantener estadísticas del protocolo.
- Activar o desactivar la cuenta.

---

## Gestión del Conocimiento

Los usuarios podrán:
- Crear conocimiento (Memory).
- Actualizar conocimiento.
- Archivar conocimiento.
- Restaurar conocimiento archivado.
- Consultar todas sus versiones.
- Verificar la integridad mediante SHA-256.

Cada memoria registra:
- Propietario.
- Hash.
- CID.
- Versión.
- Tipo (Preference, Knowledge, Document, Objective, Other).
- Visibilidad (Private por defecto, Public, Restricted).
- Estado (Active, Archived).

El contenido permanece cifrado en IPFS.
Las memorias nunca se eliminan.

---
## Gestión de Agentes
Los usuarios podrán:
- Crear agentes personales.
- Actualizar agentes.
- Archivar agentes.
- Restaurar agentes.
- Consultar versiones anteriores.

Cada agente almacena un Blueprint en IPFS.

La blockchain únicamente registra:

- Propietario.
- Hash.
- CID.
- Versión.
- Estado (Active, Archived).

---

## Gestión del Contexto

MemoryChain permite construir relaciones entre memorias y agentes.

Relación:

```
Un Agente
      ↕
Varias Memorias

Una Memoria
      ↕
Varios Agentes
```

Cada relación registra:
- Prioridad.
- Estado (enabled/disabled).
- Fecha de creación.

El llamador debe ser propietario de AMBOS recursos (agente y memoria) para modificar enlaces.

Gracias a esto un mismo conocimiento puede ser reutilizado por distintos agentes sin duplicar información.

---

## Sistema de Créditos

MemoryChain incorpora un sistema interno llamado **Memory Credits (MC)**.

Los créditos representan el costo computacional asociado al procesamiento mediante Inteligencia Artificial.

Ejemplo:

| Acción | Costo |
|---------|------:|
| Crear Agente | 5 MC |
| Actualizar Agente | 2 MC |
| Crear Memoria | 1 MC |
| Actualizar Memoria | 1 MC |
| Ejecutar Agente | 2 MC |

Los créditos cubren:

- Uso de LLMs.
- Generación de embeddings.
- Cifrado.
- Almacenamiento en IPFS.
- Infraestructura del backend.

Los costos de gas de Arbitrum permanecen completamente independientes.

Las operaciones de creación y actualización utilizan una sola llamada cross-contract (`consumeCreditsForOp`) que combina la consulta de fee y el consumo de créditos, reduciendo el overhead de gas.
---

## Auditoría

Cada acción importante genera un evento verificable.
Ejemplos:
- Usuario registrado.
- Memoria creada.
- Memoria actualizada.
- Memoria archivada.
- Agente creado.
- Agente actualizado.
- Relación creada.
- Créditos consumidos.

---

# 📜 Smart Contracts
## 👤 UserRegistry
Gestiona los usuarios del protocolo.

### Responsabilidades
- Registrar usuarios.
- Gestionar perfiles.
- Mantener estadísticas.
- Validar usuarios registrados.

---

## 🧠 MemoryRegistry
Gestiona el ciclo de vida del conocimiento.

### Responsabilidades
- Crear memorias.
- Actualizar memorias.
- Archivar memorias.
- Restaurar memorias.
- Gestionar versiones.
- Registrar hashes.
- Registrar CIDs.
- Validar tipo de memoria (0-4) y visibilidad (0-2, por defecto: 0=Private).

No almacena información privada.

---

## 🤖 AgentRegistry
Gestiona los agentes personales.

### Responsabilidades
- Crear agentes (CID + hash).
- Actualizar agentes.
- Archivar agentes.
- Restaurar agentes.
- Gestionar versiones.
- Registrar Blueprints almacenados en IPFS.

---

## 🔗 ContextRegistry
Es el núcleo del protocolo.
Administra la relación entre agentes y memorias.

### Responsabilidades
- Asociar memorias a agentes.
- Eliminar asociaciones.
- Gestionar prioridades.
- Habilitar/deshabilitar enlaces.
- Consultar el contexto de un agente.
- Consultar qué agentes utilizan una memoria.

Implementa la relación muchos a muchos entre ambos recursos.
El llamador debe ser propietario de AMBOS recursos (agente y memoria) para modificar enlaces.

---

## 💳 CreditManager

Gestiona los Memory Credits.

### Responsabilidades
- Comprar créditos.
- Consumir créditos.
- Consumir créditos por operación (una sola llamada cross-contract).
- Consultar saldo.
- Reembolsar créditos.
- Configurar costos de operaciones.

Los Memory Credits no son un token ERC-20.

---

## 📜 AuditRegistry
Mantiene el historial verificable del protocolo.

### Responsabilidades
- Registrar eventos.
- Consultar historial de usuarios.
- Consultar historial de memorias.
- Consultar historial de agentes.
---

# 🔐 Estrategia de Almacenamiento

## On-chain
La blockchain únicamente almacena:
- Propietarios.
- Hashes.
- Relaciones.
- Versiones.
- Tipo de memoria (0-4).
- Visibilidad (0=Private, 1=Public, 2=Restricted).
- Estado (Active/Archived).
- Créditos.
- Eventos.

---

## Off-chain
Los datos privados permanecen cifrados.
Se almacenan:
- Contenido de memorias.
- Blueprints de agentes.
- Prompts.
- Embeddings.
- Configuraciones.

Utilizando:

- IPFS
- PostgreSQL + pgvector

---

# ⚙️ Stack Tecnológico

## Frontend
- Next.js
- Scaffold Stylus

## Backend
- FastAPI

## Blockchain
- Arbitrum Stylus
- Rust

## Almacenamiento
- IPFS
- PostgreSQL
- pgvector

## Inteligencia Artificial
- OpenAI
- Claude

## Wallet
- MetaMask

---

# 🚀 Escalabilidad
La arquitectura fue diseñada para crecer sin modificar los contratos existentes.

Próximas versiones:
- Compartir conocimiento entre usuarios.
- Marketplace de agentes.
- Organizaciones.
- Agentes colaborativos.
- DID.
- Zero-Knowledge Proofs.
- Monetización de conocimiento.
---


# 🎯 ¿Por qué Arbitrum?
Arbitrum no se utiliza como almacenamiento.
Su función es proporcionar una capa de confianza.
MemoryChain utiliza Arbitrum para garantizar:

- Propiedad verificable.
- Integridad criptográfica.
- Versionado.
- Auditoría.
- Relaciones verificables entre recursos.

Sin blockchain, el protocolo perdería la capacidad de demostrar quién es el propietario del conocimiento, cómo evolucionó y qué agentes están autorizados para utilizarlo.

Por ello, Arbitrum no es un complemento, sino un componente esencial de MemoryChain.

---

# 🗂 Documentación técnica y estado

- **[CHANGELOG.md](./CHANGELOG.md)** — cambios realizados, auditoría de uso (qué se usa y qué no), estado de eventos y trabajo futuro.
- **[app/readme.md](./app/readme.md)** — guía de desarrollo (Scaffold-Stylus): deploy red-aware, credenciales estandarizadas y setup de Account Abstraction.
- **[app/packages/stylus/contracts/README.md](./app/packages/stylus/contracts/README.md)** — documentación de los contratos (funciones, eventos, deploy legacy + moderno).
- **[docs/architecture.md](./docs/architecture.md)** — arquitectura técnica y **direcciones actuales de todos los contratos desplegados**.

## 🧾 Contratos desplegados (Arbitrum Sepolia · 421614)

### Contratos Stylus

| Contrato | Dirección |
|---|---|
| CreditManager | `0x671f90db2642a3ac78389f701431561921bb47fb` |
| UserRegistry | `0x0b5b3c00965f7fe3f350bad3c49fdc989f71fbda` |
| MemoryRegistry | `0x64cbfbda8218cf9d70974565cdb854ff608eec02` |
| AgentRegistry | `0x0f863dc5615b771b4e7bc0510d34f8077a5b0753` |
| ChatRegistry | `0xc0f809540de925a2a9cd3334c095a3b5cb8daebd` |
| ContextRegistry | `0xa26daec24bc74cd36e4cab9b2ade0256adcda59f` |
| AuditRegistry | `0xe2670b83bb20801759091931c5f14fe0aed2dd63` |

### Account Abstraction (ERC-4337 v0.6)

| Contrato | Dirección |
|---|---|
| EntryPoint | `0x78fea18e70c9372df8f52a60f8b3f81c79c87af5` |
| SimpleAccountFactory | `0xe9606ba1da696cd0fd14a4d195f50aecec2f1596` |

## Estado actual (resumen)

- **Contratos:** 7 (CreditManager, UserRegistry, MemoryRegistry, AgentRegistry, ChatRegistry, ContextRegistry, AuditRegistry) en Arbitrum Stylus (Rust → WASM).
- **Redes:** Nitro (dev local), Arbitrum Sepolia y Arbitrum One — deploy red-aware vía `pnpm run deploy:contracts --network <red>`.
- **Autenticación:** SIWE (sesión por cookie) + `kWallet` para cifrar datos en IPFS.
- **Producción (en desarrollo):** Account Abstraction v0.6 — el usuario firma a través de su smart account mediante **session keys** (UserOps vía bundler Alto); el backend firma solo en dev. Las lecturas de listados/balance resuelven el **smart account** del usuario (no la wallet). El `CreditManager` fue re-desplegado para soportar `msg_value` en compras vía smart account.
- **Eventos:** los contratos emiten ~40 eventos on-chain; el **consumo** (indexado/feed) es trabajo futuro (ver CHANGELOG).

---

# 📑 Índice de documentos

## Nivel raíz

- [📄 **README.md**](./README.md) — descripción general del protocolo (este archivo).
- [📝 **CHANGELOG.md**](./CHANGELOG.md) — cambios realizados, auditoría de uso, estado de eventos y trabajo futuro.
- [🏗 **docs/architecture.md**](./docs/architecture.md) — arquitectura técnica + **direcciones actuales de los contratos desplegados**.
- [🏛 **docs/preview.html**](./docs/preview.html) — vista previa del diagrama de arquitectura.
- [👁 **docs/img/**](./docs/img/) — imágenes y diagramas (arch.png, api-client.png, crypto-aes.webp, etc.).

## App (desarrollo / Scaffold-Stylus)

- [🚀 **app/readme.md**](./app/readme.md) — guía de desarrollo: deploy red-aware, credenciales estandarizadas y setup de Account Abstraction.
- [⚙️ **app/docker-compose.yml**](./app/docker-compose.yml) — servicios dockerizados (IPFS, Redis, Hono, Next.js, nginx).

## Backend (Hono)

- [🔧 **app/packages/hono/README.md**](./app/packages/hono/README.md) — documentación del backend: endpoints, modos dev/producción, configuración y UserOps.

## Contratos (Stylus)

- [🧱 **app/packages/stylus/contracts/README.md**](./app/packages/stylus/contracts/README.md) — documentación de los 7 contratos: funciones, eventos, errores, fees, deploy y troubleshooting.
- [🔐 **app/packages/stylus/contracts/aa/README.md**](./app/packages/stylus/contracts/aa/README.md) — Account Abstraction ERC-4337 v0.6: EntryPoint + SimpleAccountFactory (deploy y direcciones).
- [📦 **app/packages/stylus/deployments/**](./app/packages/stylus/deployments/) — artefactos de deploy por red (`arbitrumSepolia_421614_latest.json`, etc.).

## Otros

- [🌐 **app/nitro-devnode/README.md**](./app/nitro-devnode/README.md) — nodo de desarrollo local Nitro (librería externa).
