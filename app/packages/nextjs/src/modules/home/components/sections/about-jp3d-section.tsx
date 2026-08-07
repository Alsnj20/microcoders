"use client";

export const AboutJp3dSection = () => {
  const problems = [
    {
      title: "Memoria Bloqueada en Silos",
      desc: "El usuario no es propietario de su memoria. El conocimiento permanece encerrado dentro de plataformas centralizadas cerradas.",
      icon: "lock",
    },
    {
      title: "Falta de Interoperabilidad",
      desc: "No existe transferencia entre distintos agentes de IA. Cada nuevo agente comienza desde cero (Cold Start) sin contexto previa.",
      icon: "shuffle",
    },
    {
      title: "Sin Evidencia Criptográfica",
      desc: "No existe prueba inalterable de que una memoria no haya sido modificada o manipulada por terceros en un servidor cerrado.",
      icon: "warning",
    },
  ];

  const solutions = [
    {
      title: "Propiedad Total de Conocimiento y Agentes",
      desc: "El usuario es propietario de su conocimiento personal, sus agentes de IA y las relaciones N:M entre ambos.",
      icon: "verified",
    },
    {
      title: "Reutilización de Contexto Compartido",
      desc: "Un mismo conocimiento puede ser reutilizado por múltiples agentes sin duplicar información ni perder coherencia.",
      icon: "hub",
    },
    {
      title: "Integridad SHA-256 e Historial Verificable",
      desc: "La blockchain registra hashes criptográficos inmutables, manteniendo privacidad total fuera de la cadena.",
      icon: "shield_lock",
    },
  ];

  return (
    <section id="problem" className="py-24 bg-muted/40 border-y border-border/40">
      <div className="px-6 md:px-12 max-w-7xl mx-auto space-y-20">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-block bg-destructive/10 text-destructive text-xs font-bold px-4 py-1.5 rounded-full border border-destructive/20">
            EL PROBLEMA ACTUAL
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
            La Paradoja del Conocimiento en IA
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Las plataformas actuales encierran tus datos en silos. Al cambiar de herramienta, pierdes todo tu contexto acumulado.
          </p>
        </div>

        {/* Problem Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {problems.map((p) => (
            <div
              key={p.title}
              className="bg-card p-8 rounded-2xl border border-destructive/20 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="w-12 h-12 bg-destructive/10 text-destructive rounded-xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-2xl">{p.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{p.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Solution Section Header */}
        <div id="solution" className="pt-12 text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full border border-primary/20">
            💡 LA SOLUCIÓN MEMORYCHAIN
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Desacoplamiento de Memoria y Capa de Confianza
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Separamos el almacenamiento privado cifrado off-chain de los registros verificables on-chain en Arbitrum Stylus.
          </p>
        </div>

        {/* Solution Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {solutions.map((s) => (
            <div
              key={s.title}
              className="bg-card p-8 rounded-2xl border border-primary/20 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-2xl">{s.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
