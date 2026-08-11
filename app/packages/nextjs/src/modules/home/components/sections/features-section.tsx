"use client";

import type { SignKey } from "../../constants/signs";
import { Sign } from "../ui/sign";

const features: { sign: SignKey; title: string; description: string }[] = [
  {
    sign: "shield",
    title: "Propiedad verificable",
    description: "Cada memoria lleva un sello criptográfico que prueba que es tuya. Sin blockchain, sin mentiras.",
  },
  {
    sign: "aiAgent",
    title: "Multi-agente",
    description: "Un mismo conocimiento, múltiples agentes. Sin duplicar datos, sin perder contexto.",
  },
  {
    sign: "padlockBadge",
    title: "Privacidad total",
    description: "Tu información nunca sale cifrada. Ni siquiera nosotros podemos leerla.",
  },
  {
    sign: "history",
    title: "Historial completo",
    description: "Cada cambio queda registrado. Ves exactamente cómo evolucionó tu conocimiento.",
  },
  {
    sign: "interoperable",
    title: "Compatible con todo",
    description: "Funciona con GPT-4o, Claude, Gemini y más. Sin vendor lock-in.",
  },
  {
    sign: "memory",
    title: "Memoria persistente",
    description: "Tu agente no olvida entre sesiones. Recuerda todo lo que le has dicho.",
  },
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 border-y border-border/40">
      <div className="px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full border border-primary/20">
            CARACTERÍSTICAS
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">Construido para durar</h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Cada componente diseñado con un propósito: darte control total sobre tu conocimiento.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map(feature => (
            <div
              key={feature.title}
              className="p-6 rounded-2xl bg-card border border-border/60 hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-5 group-hover:bg-primary/20 transition-colors">
                <Sign name={feature.sign} size={48} className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
