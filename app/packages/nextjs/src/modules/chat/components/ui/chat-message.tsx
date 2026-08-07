"use client";

import { User } from "lucide-react";
import { PetAvatar } from "~~/src/modules/pet/components/pet-avatar";
import { usePet } from "~~/src/modules/pet/hooks/use-pet";
import type { ChatMessage as ChatMessageType } from "../../types/chat";

const PET_SIZE = 36;
const SPRITE_SCALE = PET_SIZE / 16;

function BotAvatar() {
  const pet = usePet({ spritesheet: "/sprites/pet.png" });

  return (
    <div
      className="flex items-center justify-center shrink-0 cursor-pointer overflow-hidden p-1"
      onMouseEnter={pet.blink}
      onClick={pet.jump}
    >
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
  );
}

export function ChatMessage({ role, content }: ChatMessageType) {
  const isUser = role === "user";

  return (
    <div
      className={`flex items-end gap-3 max-w-2xl w-full ${isUser ? "ml-auto flex-row-reverse" : "mr-auto flex-row"}`}
    >
      {isUser ? (
        null
      ) : (
        <BotAvatar />
      )}

      {/* Message Bubble */}
      <div
        className={`px-4 py-3 rounded-2xl text-sm md:text-base leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-xs"
            : "bg-muted text-foreground border border-border rounded-tl-xs"
        }`}
      >
        <p className="whitespace-pre-wrap font-sans">{content}</p>
      </div>
    </div>
  );
}
