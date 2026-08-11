"use client";

import { Sign } from "../ui/sign";

const steps = [
  {
    number: "01",
    sign: "wallet" as const,
    title: "Conecta tu wallet",
    description: "Sin registros, sin formularios. Solo conecta tu wallet y listo.",
  },
  {
    number: "02",
    sign: "brain" as const,
    title: "Crea tu agente",
    description: "Dale nombre y personalidad. Él será tu asistente personal de IA.",
  },
  {
    number: "03",
    sign: "padlock" as const,
    title: "Almacena tu conocimiento",
    description: "Lo que quieras que recuerde, queda cifrado y seguro en IPFS.",
  },
  {
    number: "04",
    sign: "chainLink" as const,
    title: "Tu agente recuerda",
    description: "Entre sesiones, entre modelos, siempre te conoce.",
  },
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-24 border-y border-border/40">
      <div className="px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full border border-primary/20">
            CÓMO FUNCIONA
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
            En 4 pasos, tu IA te recuerda
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Olvídate de explicarle lo mismo a cada agente. MemoryChain hace que tu conocimiento viaje contigo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative overflow-hidden p-4">
          {steps.map((step, index) => (
            <div key={step.number} className="relative flex flex-col items-center text-center group">
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-[55%] w-[45%] h-0.5 bg-border/60">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary/40" />
                </div>
              )}

              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-2xl bg-card border border-border/60 shadow-md flex items-center justify-center group-hover:border-primary/50 group-hover:shadow-lg transition-all duration-300">
                  <Sign name={step.sign} size={64} className="w-14 h-14" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                  {step.number}
                </div>
              </div>

              <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-60">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
