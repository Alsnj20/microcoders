"use client";

export const ProjectsSection = () => {
  const contracts = [
    {
      name: "UserRegistry",
      icon: "person",
      type: "Smart Contract • Rust",
      desc: "Gestiona el registro de usuarios mediante wallet, perfiles, estadísticas del protocolo y estado de cuenta activo/inactivo.",
      onChain: ["User Wallet Address", "Username Profile", "Protocol Stats", "Account Status"],
    },
    {
      name: "MemoryRegistry",
      icon: "psychology",
      type: "Smart Contract • Rust",
      desc: "Administra el ciclo de vida del conocimiento (crear, actualizar, archivar, restaurar) y garantiza la integridad sin almacenar datos privados.",
      onChain: ["Owner Address", "Hash SHA-256", "CID IPFS", "Versiones acumuladas"],
    },
    {
      name: "AgentRegistry",
      icon: "smart_toy",
      type: "Smart Contract • Rust",
      desc: "Gestiona agentes personales registrando un Blueprint almacenado en IPFS, control de versiones y estado del agente.",
      onChain: ["Owner Address", "Blueprint Hash", "CID IPFS Blueprint", "Versiones de Agente"],
    },
    {
      name: "ContextRegistry",
      icon: "hub",
      type: "Smart Contract • Rust",
      desc: "El núcleo del protocolo. Administra las relaciones N:M entre agentes y memorias, prioridades y consultas de contexto compartidas.",
      onChain: ["Relación Agente ↔ Memorias", "Prioridad de Contexto", "Estado de Relación", "Fecha de Creación"],
    },
    {
      name: "CreditManager",
      icon: "payments",
      type: "Smart Contract • Rust",
      desc: "Administra el sistema interno de Memory Credits (MC) para cubrir el costo computacional de procesamiento de IA y backend.",
      onChain: ["Saldo de Créditos", "Consumo por Acción", "Compra / Reembolso", "Tarifas Operativas"],
    },
    {
      name: "AuditRegistry",
      icon: "verified_user",
      type: "Smart Contract • Rust",
      desc: "Mantiene el historial verificable e inmutable de todos los eventos clave ejecutados dentro del protocolo MemoryChain.",
      onChain: ["Eventos de Usuario", "Eventos de Memoria", "Eventos de Agente", "Auditoría de Créditos"],
    },
  ];

  return (
    <section id="contracts" className="py-24 max-w-7xl mx-auto px-6 md:px-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full border border-primary/20">
          📜 SMART CONTRACTS EN RUST
        </span>
        <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
          Arquitectura On-Chain sobre Arbitrum Stylus
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
          Cada modulo del protocolo esta diseñado modularmente en Rust para garantizar ejecuciones eficientes, auditoria inmutable y costos mínimos.
        </p>
      </div>

      {/* Grid of 6 Contracts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {contracts.map((c) => (
          <div
            key={c.name}
            className="bg-card p-8 rounded-2xl border border-border/80 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">{c.icon}</span>
                </div>
                <span className="text-xs font-mono px-3 py-1 bg-muted rounded-md text-muted-foreground">
                  {c.type}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-3">{c.name}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">{c.desc}</p>
            </div>

            <div className="pt-4 border-t border-border/40">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 font-mono">
                Registrado On-Chain:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {c.onChain.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs font-mono px-2.5 py-1 rounded-md bg-primary/5 text-primary border border-primary/10"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
