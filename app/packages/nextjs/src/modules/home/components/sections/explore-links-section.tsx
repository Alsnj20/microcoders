"use client";

import Link from "next/link";

export const ExploreLinksSection = () => {
  return (
    <section id="features" className="py-24 bg-card border-t border-border/40">
      <div className="px-6 md:px-12 max-w-7xl mx-auto space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full border border-primary/20">
            🎯 VENTAJAS CLAVE
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Diseñado para la Era de la Inteligencia Soberana
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            MemoryChain combina la seguridad de Web3 con la velocidad de ejecución de la Inteligencia Artificial.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: "memory",
              title: "Memoria Persistente Integrada",
              desc: "Tus agentes recuerdan el contexto a lo largo de las sesiones, construyendo un gráfico de conocimiento vivo que evoluciona contigo.",
            },
            {
              icon: "verified_user",
              title: "Confianza Criptográfica Inmutable",
              desc: "Cada interacción y versión es verificable en blockchain mediante hashes SHA-256 e IPFS CIDs.",
            },
            {
              icon: "swap_horiz",
              title: "Interoperabilidad Multi-Modelo",
              desc: "Conecta tus conocimientos con OpenAI GPT-4o, Claude o flujos personalizados mediante el Vercel AI SDK sin perder datos.",
            },
          ].map(feature => (
            <div
              key={feature.title}
              className="p-8 rounded-2xl bg-muted/30 border border-border/60 hover:border-primary/50 transition-all duration-200"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-2xl">{feature.icon}</span>
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Call to action card */}
        <div className="p-10 rounded-3xl bg-primary text-primary-foreground text-center space-y-6 shadow-xl">
          <h3 className="text-3xl md:text-4xl font-extrabold">¿Listo para tomar el control de tu conocimiento?</h3>
          <p className="text-base md:text-lg opacity-90 max-w-2xl mx-auto">
            Únete a la red de desarrolladores que construyen agentes de IA verdaderamente interoperables y soberanos
            sobre Arbitrum Stylus.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Link
              href="/chat"
              className="bg-background text-foreground text-sm font-semibold px-8 py-4 rounded-xl hover:bg-muted transition-all shadow-md flex items-center justify-center gap-2"
            >
              <span>Probar Agente en DApp</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};
