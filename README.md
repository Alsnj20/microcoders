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
         ┌──────────────┴──────────────┐
         ▼                             ▼
  MemoryRegistry               AgentRegistry
         │                             │
         └──────────────┬──────────────┘
                        ▼
                ContextRegistry
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
  CreditManager                 AuditRegistry
```

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
- Estado.
- Fecha de creación.

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

No almacena información privada.

---

## 🤖 AgentRegistry
Gestiona los agentes personales.

### Responsabilidades
- Crear agentes.
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
- Consultar el contexto de un agente.
- Consultar qué agentes utilizan una memoria.

Implementa la relación muchos a muchos entre ambos recursos.

---

## 💳 CreditManager

Gestiona los Memory Credits.

### Responsabilidades
- Comprar créditos.
- Consumir créditos.
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
- Créditos.
- Eventos.

---

## Off-chain
Los datos privados permanecen cifrados.
Se almacenan:
- Memorias.
- Blueprints.
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
