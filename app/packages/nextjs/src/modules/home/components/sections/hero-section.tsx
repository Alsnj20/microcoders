"use client";

import Link from "next/link";
import { HeroClient } from "../ui/hero-client";

export const HeroSection = () => {
  return (
    <section id="hero" className="px-6 md:px-12 py-24 md:py-32 max-w-7xl mx-auto text-center flex flex-col items-center justify-center min-h-screen pt-28">
      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6 shadow-sm">
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span>Construido sobre Arbitrum Stylus (Rust)</span>
      </div>

      {/* Main Headline */}
      <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-foreground mb-6 max-w-4xl mx-auto">
        El protocolo descentralizado para la <span className="text-primary underline decoration-primary/30 underline-offset-8">propiedad del conocimiento</span> de tus Agentes de IA.
      </h1>

      {/* Subtitle */}
      <p className="text-lg md:text-xl leading-relaxed text-muted-foreground max-w-3xl mx-auto mb-10">
        MemoryChain separa el almacenamiento cifrado fuera de la cadena de la capa de confianza en blockchain. Tu información privada permanece segura en IPFS y PostgreSQL (pgvector), mientras Arbitrum garantiza propiedad, integridad SHA-256 y versionado.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center w-full sm:w-auto mb-16">
        <Link
          href="/chat"
          className="bg-primary text-primary-foreground text-base font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-primary/25 active:scale-95 text-center flex items-center justify-center gap-2"
        >
          <span>Lanzar Aplicación</span>
          <span className="material-symbols-outlined text-lg">arrow_forward</span>
        </Link>

        <a
          href="#architecture"
          className="bg-card text-foreground text-base font-semibold px-8 py-4 rounded-xl border border-border/80 hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 active:scale-95 text-center flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">account_tree</span>
          <span>Ver Arquitectura</span>
        </a>
      </div>

      {/* Hero Client Widget */}
      <HeroClient />
    </section>
  );
};
