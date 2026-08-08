"use client";

import { PetAvatar } from "~~/src/modules/pet/components/pet-avatar";
import { usePet } from "~~/src/modules/pet/hooks/use-pet";

const SIZES = {
  sm: { size: 24, scale: 1.5 },
  md: { size: 32, scale: 2 },
  lg: { size: 40, scale: 2.5 },
} as const;

interface SharedBotAvatarProps {
  size?: "sm" | "md" | "lg";
}

export function SharedBotAvatar({ size = "md" }: SharedBotAvatarProps) {
  const pet = usePet({ spritesheet: "/sprites/pet.png" });
  const { scale } = SIZES[size];

  return (
    <div
      className="shrink-0 cursor-pointer overflow-hidden"
      onMouseEnter={pet.blink}
      onClick={pet.jump}
      onKeyDown={e => e.key === "Enter" && pet.jump()}
      role="button"
      tabIndex={0}
    >
      <PetAvatar
        spritesheet="/sprites/pet.png"
        currentState={pet.currentState}
        currentFrame={pet.currentFrame}
        position={{ x: 0, y: 0 }}
        frameWidth={16}
        frameHeight={16}
        scale={scale}
        positionMode="relative"
      />
    </div>
  );
}
