"use client";

import { useState } from "react";
import { PetAvatar } from "~~/src/modules/pet/components/pet-avatar";
import { usePet } from "~~/src/modules/pet/hooks/use-pet";

const PET_SIZE = 48;
const SPRITE_SCALE = PET_SIZE / 16;

export const HeroClient = () => {
  const [activeTab, setActiveTab] = useState<"memory" | "agent" | "context">("memory");
  const pet = usePet({ spritesheet: "/sprites/pet.png", autoBlink: true, blinkInterval: [3000, 6000] });

  return (
    <div className="w-full max-w-4xl">
      {/* Small pet */}
      <div className="w-full flex justify-start pl-8 mb-2">
        <PetAvatar
          spritesheet="/sprites/pet.png"
          currentState={pet.currentState}
          currentFrame={pet.currentFrame}
          position={{ x: 0, y: 0 }}
          frameWidth={16}
          frameHeight={16}
          scale={SPRITE_SCALE}
          positionMode="relative"
        />
      </div>

      {/* Card */}
      <div className="w-full rounded-2xl border border-border bg-card shadow-2xl overflow-hidden text-left">
        {/* Header bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-muted/60 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-destructive/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
            <span className="ml-3 text-xs font-mono text-muted-foreground">Arbitrum Stylus • Protocol State</span>
          </div>

          <div className="flex gap-2">
            {(["memory", "agent", "context"] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Content panel */}
        <div className="p-6 md:p-8 font-mono text-xs md:text-sm leading-relaxed space-y-4">
          {activeTab === "memory" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="text-primary font-bold">🧠 MemoryRegistry.rs</span>
                <span className="text-emerald-500 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  VERIFIED (SHA-256)
                </span>
              </div>
              <p className="text-muted-foreground">
                <span className="text-foreground font-semibold">Memory CID:</span> ipfs://QmX9z7p2W...8hF9aK
              </p>
              <p className="text-muted-foreground">
                <span className="text-foreground font-semibold">Integrity Hash:</span>{" "}
                0xe3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
              </p>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-foreground font-sans text-xs flex justify-between items-center">
                <div>
                  <p className="font-semibold">Información Privada Cifrada</p>
                  <p className="text-muted-foreground text-xs">Almacenada Off-Chain cifrada de extremo a extremo en IPFS</p>
                </div>
                <span className="material-symbols-outlined text-primary text-2xl">lock</span>
              </div>
            </div>
          )}

          {activeTab === "agent" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="text-primary font-bold">🤖 AgentRegistry.rs</span>
                <span className="text-primary font-semibold">BLUEPRINT VERSION: v1.4.0</span>
              </div>
              <p className="text-muted-foreground">
                <span className="text-foreground font-semibold">Agent ID:</span> 0x71C...90B (Personal Assistant)
              </p>
              <p className="text-muted-foreground">
                <span className="text-foreground font-semibold">Blueprint CID:</span> ipfs://bafybeic2...3x9q
              </p>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-foreground font-sans text-xs flex justify-between items-center">
                <div>
                  <p className="font-semibold">Modelos Compatibles</p>
                  <p className="text-muted-foreground text-xs">OpenAI GPT-4o, Claude 3.5 Sonnet, Gemini (Vercel AI SDK)</p>
                </div>
                <span className="material-symbols-outlined text-secondary text-2xl">smart_toy</span>
              </div>
            </div>
          )}

          {activeTab === "context" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/30 pb-2">
                <span className="text-primary font-bold">🔗 ContextRegistry.rs</span>
                <span className="text-amber-500 font-semibold">RELACIÓN N:M ACTIVA</span>
              </div>
              <p className="text-muted-foreground">
                <span className="text-foreground font-semibold">Agente ↔ Memorias:</span> Priority #1 • Active Context
              </p>
              <p className="text-muted-foreground">
                <span className="text-foreground font-semibold">Reutilización:</span> Sin duplicación de datos entre
                agentes.
              </p>
              <div className="p-4 rounded-xl bg-muted/40 border border-border/50 text-foreground font-sans text-xs flex justify-between items-center">
                <div>
                  <p className="font-semibold">Costo Computacional</p>
                  <p className="text-muted-foreground text-xs">Descontado automáticamente en Memory Credits (MC)</p>
                </div>
                <span className="material-symbols-outlined text-amber-500 text-2xl">credit_card</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
