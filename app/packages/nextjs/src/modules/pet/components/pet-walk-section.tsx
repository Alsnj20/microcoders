"use client";

import { useEffect, useRef, useState } from "react";
import { useWalkCycle } from "../hooks/use-walk-cycle";
import { PetAvatar } from "./pet-avatar";

const PET_SIZE = 200;
const SPRITE_SCALE = PET_SIZE / 16;
const CROSS_SECONDS = 18;
const FPS = 60;

export function PetWalkSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [sectionWidth, setSectionWidth] = useState(1200);

  const walkDistance = sectionWidth - PET_SIZE;
  const speed = walkDistance / (CROSS_SECONDS * FPS);

  const pet = useWalkCycle({
    spritesheet: "/sprites/pet.png",
    speed,
    width: walkDistance,
  });

  useEffect(() => {
    if (!sectionRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setSectionWidth(entry.contentRect.width);
      }
    });

    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full bg-card flex justify-center">
    <section ref={sectionRef} className="max-w-7xl relative w-full overflow-hidden" style={{ height: PET_SIZE + 32 }}>
      <div
        className="absolute bottom-8 left-0 right-0 h-px mx-12"
        style={{
          background: "linear-gradient(90deg, transparent, var(--border) 10%, var(--border) 90%, transparent)",
        }}
      />

      <PetAvatar
        spritesheet="/sprites/pet.png"
        currentState={pet.currentState}
        currentFrame={pet.currentFrame}
        position={pet.position}
        frameWidth={16}
        frameHeight={16}
        scale={SPRITE_SCALE}
      />
      </section>
    </div>
  );
}
