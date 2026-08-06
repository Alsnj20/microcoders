"use client";

import { ServicesGrid } from "../ui/services-grid";

export const ServicesSection = () => {
  return (
    <section id="credits" className="py-24 bg-muted/40 border-y border-border/40">
      <div className="px-6 md:px-12 max-w-7xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full border border-primary/20">
            💳 SISTEMA DE MEMORY CREDITS (MC)
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Economía Interna de Cómputo e IA
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Los Memory Credits representan el costo de inferencia de LLMs, embeddings vectoriales (pgvector), cifrado y almacenamiento IPFS. Los costos de gas de Arbitrum se mantienen independientes.
          </p>
        </div>

        {/* Services Grid UI Component */}
        <ServicesGrid />

        {/* Info Box */}
        <div className="bg-card p-8 rounded-2xl border border-border/80 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-2xl">account_balance_wallet</span>
            </div>
            <div>
              <h4 className="text-lg font-bold text-foreground">Gestión Transparente de Saldo</h4>
              <p className="text-sm text-muted-foreground">
                Compre créditos con su wallet, consulte su saldo en tiempo real y consulte reembolsos desde CreditManager.
              </p>
            </div>
          </div>
          <a
            href="/chat"
            className="bg-primary text-primary-foreground text-sm font-semibold px-6 py-3 rounded-xl hover:opacity-90 transition-all shrink-0 shadow-md"
          >
            Adquirir Créditos
          </a>
        </div>
      </div>
    </section>
  );
};
