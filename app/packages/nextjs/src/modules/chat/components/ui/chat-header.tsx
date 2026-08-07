"use client";

import Link from "next/link";
import { PetAvatar } from "~~/src/modules/pet/components/pet-avatar";
import { usePet } from "~~/src/modules/pet/hooks/use-pet";

const PET_SIZE = 32;
const SPRITE_SCALE = PET_SIZE / 16;

interface ChatHeaderProps {
  activeAgentName?: string;
}

export function ChatHeader({ activeAgentName = "Trading Bot" }: ChatHeaderProps) {
  const pet = usePet({ spritesheet: "/sprites/pet.png", autoBlink: true, blinkInterval: [4000, 8000] });

  return (
    <header className="sticky top-0 z-40 bg-background/90 border-b border-border/80 backdrop-blur-md flex justify-between items-center w-full px-6 h-16">
      <Link
        href="/"
        className="font-['Source_Serif_4'] text-xl font-medium tracking-tight text-foreground flex items-center gap-2 hover:opacity-90 transition-opacity"
      >
        <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
          <PetAvatar
            spritesheet="/sprites/pet.png"
            currentState={pet.currentState}
            currentFrame={pet.currentFrame}
            position={{ x: 0, y: 0 }}
            frameWidth={16}
            frameHeight={16}
            scale={SPRITE_SCALE}
            positionMode="relative"
            onClick={pet.onClick}
            onHover={pet.onHover}
          />
        </div>
        <span>MemoryChain</span>
      </Link>

      {/* Contextual Navigation */}
      <div className="hidden md:flex items-center gap-6">
        <Link href="/chat" className="text-sm font-medium text-foreground border-b-2 border-primary pb-0.5">
          Chats
        </Link>
        <Link href="/agents" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Agentes
        </Link>
        <Link href="/memories" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Memorias
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-input text-foreground border border-border hover:bg-surface-container-high transition-colors"
        >
          Inicio
        </Link>
      </div>
    </header>
  );
}
