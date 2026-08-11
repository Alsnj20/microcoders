"use client";

import { useState } from "react";
import { PetAvatar } from "~~/src/modules/pet/components/pet-avatar";
import { usePet } from "~~/src/modules/pet/hooks/use-pet";
import { Sign } from "../ui/sign";

const PET_SIZE = 384;
const SPRITE_SCALE = PET_SIZE / 16;

export const AboutSection = () => {
  const pet = usePet({ spritesheet: "/sprites/pet.png" });
  const [showBubble, setShowBubble] = useState(false);

  const handlePetClick = () => {
    setShowBubble(prev => !prev);
    pet.onClick?.();
  };

  return (
    <section className="py-24 border-y border-border/40">
      <div className="px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left - Pet + Speech Bubble */}
          <div className="relative rounded-2xl overflow-hidden flex flex-col items-center py-12 px-6 min-h-130">
            {/* Dot grid */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(circle, var(--primary) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            {/* Speech Bubble - only on click */}
            <div
              className={`relative z-20 transition-all duration-300 ${
                showBubble
                  ? "opacity-100 translate-y-0 mb-0 pointer-events-auto"
                  : "opacity-0 -translate-y-2 mb-0 pointer-events-none"
              }`}
            >
              <div className="relative bg-card border border-border/50 rounded-2xl px-6 py-5 shadow-lg max-w-sm w-full">
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-b border-r border-border/50 rotate-45" />
                <p className="font-orbitron text-lg font-bold text-primary text-center leading-snug">Hola, soy Nori</p>
                <p className="text-sm text-muted-foreground text-center mt-1">Tu acompañante en MemoryChain</p>
              </div>
            </div>

            {/* Pet */}
            <div className="relative z-10">
              <PetAvatar
                spritesheet="/sprites/pet.png"
                currentState={pet.currentState}
                currentFrame={pet.currentFrame}
                position={{ x: 0, y: 0 }}
                frameWidth={16}
                frameHeight={16}
                scale={SPRITE_SCALE}
                positionMode="relative"
                onClick={handlePetClick}
                onHover={pet.onHover}
              />
            </div>
          </div>

          {/* Right - Text */}
          <div className="space-y-8">
            <div className="space-y-4">
              <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full border border-primary/20">
                SOBRE MEMORYCHAIN
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight">
                Todo lo que sabes es tuyo. <span className="text-primary">Nadie más puede leerlo.</span>
              </h2>
            </div>

            <div className="space-y-5 text-muted-foreground leading-relaxed">
              <p>
                <span className="font-semibold text-foreground">MemoryChain</span> es un protocolo descentralizado
                construido sobre <span className="font-semibold text-foreground">Arbitrum Stylus</span> que te permite
                ser dueño de tu conocimiento personal y reutilizarlo entre múltiples agentes de IA.
              </p>
              <p>
                En lugar de mantener la memoria dentro de plataformas cerradas, MemoryChain separa el almacenamiento de
                datos de la capa de confianza. Tu información privada permanece{" "}
                <span className="font-semibold text-foreground">cifrada fuera de la blockchain</span>, mientras que
                Arbitrum garantiza la propiedad, la integridad y el versionado de cada recurso.
              </p>
              <p>
                Cada usuario puede crear agentes especializados y decidir qué conocimiento utilizará cada uno.{" "}
                <span className="font-semibold text-primary">Sin duplicar datos. Sin perder contexto.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
