"use client";

export const ClientsSection = () => {
  const stack = [
    { name: "FastAPI", category: "Backend Engine", icon: "bolt" },
    { name: "PostgreSQL + pgvector", category: "Vector Database", icon: "database" },
    { name: "IPFS", category: "Off-chain Encrypted Storage", icon: "cloud" },
    { name: "Flowise", category: "LLM Orchestration", icon: "account_tree" },
    { name: "OpenAI & Claude", category: "AI Models", icon: "neurology" },
    { name: "MetaMask / Wagmi", category: "Web3 Wallet Auth", icon: "account_balance_wallet" },
  ];

  return (
    <section className="py-20 border-b border-border/40 max-w-7xl mx-auto px-6 md:px-12">
      <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
        <span className="text-xs font-mono font-bold tracking-widest text-primary uppercase">
          🌐 INFRAESTRUCTURA OFF-CHAIN & ECOSISTEMA
        </span>
        <h3 className="text-2xl md:text-4xl font-bold text-foreground">
          Tecnología Híbrida de Grado Empresarial
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stack.map((item) => (
          <div
            key={item.name}
            className="p-5 rounded-2xl bg-card border border-border/60 text-center hover:border-primary/40 transition-all duration-200 flex flex-col items-center justify-center gap-2"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
            </div>
            <span className="text-sm font-bold text-foreground">{item.name}</span>
            <span className="text-xs text-muted-foreground">{item.category}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
