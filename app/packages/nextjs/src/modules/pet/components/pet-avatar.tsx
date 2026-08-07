"use client";

import type { CurrentFrame, PetPosition, PetState } from "../types/pet";

interface PetAvatarProps {
  spritesheet: string;
  currentState: PetState;
  currentFrame: CurrentFrame | null;
  position: PetPosition;
  frameWidth?: number;
  frameHeight?: number;
  scale?: number;
  positionMode?: "absolute" | "relative";
  onClick?: () => void;
  onHover?: () => void;
}

export function PetAvatar({
  spritesheet,
  currentState,
  currentFrame,
  position,
  frameWidth = 16,
  frameHeight = 16,
  scale = 3,
  positionMode = "absolute",
  onClick,
  onHover,
}: PetAvatarProps) {
  const scaledWidth = frameWidth * scale;
  const scaledHeight = frameHeight * scale;

  const backgroundPosition = currentFrame ? `-${currentFrame.x * scale}px -${currentFrame.y * scale}px` : "0px 0px";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => {
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      onMouseEnter={onHover}
      style={{
        position: positionMode,
        left: positionMode === "absolute" ? position.x : undefined,
        top: positionMode === "absolute" ? position.y : undefined,
        width: scaledWidth,
        height: scaledHeight,
        backgroundImage: `url(${spritesheet})`,
        backgroundPosition,
        backgroundSize: `${frameWidth * 4 * scale}px ${frameHeight * 4 * scale}px`,
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        cursor: "pointer",
        transition: currentState === "walk" ? "none" : "transform 0.1s",
      }}
    />
  );
}
