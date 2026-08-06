"use client";

export const VideosSection = () => {
  return (
    <section id="architecture" className="py-24 max-w-7xl mx-auto px-6 md:px-12">
      <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
        <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full border border-primary/20">
          🏗 FLUJO DE ARQUITECTURA PROTOCOLAR
        </span>
        <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
          Cómo Interactúa la Memoria y los Agentes
        </h2>
        <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
          Toda la información privada viaja cifrada a la capa off-chain, registrando de forma inmutable únicamente la metadata y hashes en Arbitrum Stylus.
        </p>
      </div>

      {/* Architecture diagram card */}
      <div className="p-8 md:p-12 rounded-3xl bg-card border border-border/80 shadow-2xl space-y-12">
        <div className="flex flex-col items-center gap-6">
          <div className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-md flex items-center gap-2">
            <span className="material-symbols-outlined">account_balance_wallet</span>
            <span>USER WALLET</span>
          </div>
          <span className="material-symbols-outlined text-muted-foreground animate-bounce">arrow_downward</span>

          <div className="px-6 py-3 rounded-xl bg-card border border-primary/40 font-bold text-sm text-foreground shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">person</span>
            <span>UserRegistry (Rust)</span>
          </div>

          <div className="w-full max-w-2xl h-0.5 bg-border/60 relative my-2">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-4 text-xs font-mono text-muted-foreground">
              Desacoplamiento de Registro
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
            <div className="p-6 rounded-2xl bg-muted/50 border border-border/60 text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-primary">psychology</span>
              <h4 className="font-bold text-foreground">MemoryRegistry</h4>
              <p className="text-xs text-muted-foreground">Lifecycle de conocimiento, Hashes SHA-256 y CIDs IPFS</p>
            </div>

            <div className="p-6 rounded-2xl bg-muted/50 border border-border/60 text-center space-y-2">
              <span className="material-symbols-outlined text-3xl text-secondary">smart_toy</span>
              <h4 className="font-bold text-foreground">AgentRegistry</h4>
              <p className="text-xs text-muted-foreground">Blueprints en IPFS, versiones y estados</p>
            </div>
          </div>

          <span className="material-symbols-outlined text-muted-foreground">arrow_downward</span>

          <div className="px-8 py-4 rounded-2xl bg-primary/10 border border-primary/30 font-bold text-base text-primary shadow-md flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl">hub</span>
            <span>ContextRegistry (Núcleo Relacional N:M)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl pt-4">
            <div className="p-5 rounded-xl bg-card border border-border/80 text-center space-y-1">
              <span className="material-symbols-outlined text-xl text-amber-500">credit_card</span>
              <h5 className="font-bold text-sm text-foreground">CreditManager</h5>
              <p className="text-xs text-muted-foreground">Descuento de Memory Credits</p>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border/80 text-center space-y-1">
              <span className="material-symbols-outlined text-xl text-emerald-500">verified_user</span>
              <h5 className="font-bold text-sm text-foreground">AuditRegistry</h5>
              <p className="text-xs text-muted-foreground">Historial e inmutabilidad</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
