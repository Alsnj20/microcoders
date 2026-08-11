"use client";

import type { SignKey } from "../../constants/signs";
import { Sign } from "../ui/sign";

interface TechItem {
  name: string;
  category: string;
  sign: SignKey;
}

const stack: TechItem[] = [
  { name: "Hono", category: "API de alto rendimiento", sign: "lightning" },
  { name: "Arbitrum Stylus", category: "Contratos en Rust WASM", sign: "chainLink" },
  { name: "IPFS", category: "Almacenamiento cifrado off-chain", sign: "globe" },
  { name: "Vercel AI SDK", category: "Orquestación de LLMs", sign: "memoryChip" },
  { name: "OpenAI & Claude", category: "Modelos de IA", sign: "brain" },
  { name: "RainbowKit", category: "Web3 Auth & wallets", sign: "wallet" },
];

export const SocialProofSection = () => {
  return (
    <section className="py-24 border-y border-border/40">
      <div className="px-6 md:px-12 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-20">
          {[
            { value: "100%", label: "Open Source" },
            { value: "6", label: "Smart Contracts" },
            { value: "6+", label: "Modelos de IA" },
            { value: "∞", label: "Posibilidades" },
          ].map(stat => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-extrabold text-primary mb-1">{stat.value}</div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Tech Stack */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
          <span className="text-xs font-bold tracking-widest text-primary uppercase">INFRAESTRUCTURA</span>
          <h3 className="text-2xl md:text-4xl font-bold text-foreground">Tecnología de grado empresarial</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stack.map(item => (
            <div
              key={item.name}
              className="p-5 rounded-2xl bg-card border border-border/60 text-center hover:border-primary/40 transition-all duration-200 flex flex-col items-center justify-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Sign name={item.sign} size={48} className="w-8 h-8" />
              </div>
              <div>
                <span className="text-sm font-bold text-foreground block">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.category}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
