"use client";

import { useEffect, useRef } from "react";
import type { UsePetConfig, UsePetReturn } from "../types/pet";
import { usePet } from "./use-pet";

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function getRandomTarget(currentX: number, maxWidth: number): number {
  const percent = 0.2 + Math.random() * 0.3;
  const distance = maxWidth * percent;
  const direction = Math.random() < 0.5 ? -1 : 1;
  const target = currentX + distance * direction;
  return Math.max(0, Math.min(maxWidth, target));
}

interface WalkCycleConfig extends UsePetConfig {
  width: number;
  idlePause?: [number, number];
}

export function useWalkCycle(config: WalkCycleConfig): UsePetReturn {
  const { width, idlePause = [2000, 3000], ...petConfig } = config;

  const pet = usePet({ ...petConfig, autoBlink: false });

  const isIdleRef = useRef(true);
  const petRef = useRef(pet);
  petRef.current = pet;
  const widthRef = useRef(width);
  widthRef.current = width;
  const idlePauseRef = useRef(idlePause);
  idlePauseRef.current = idlePause;
  const positionRef = useRef(0);
  const walkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const target = getRandomTarget(0, widthRef.current);
    isIdleRef.current = false;
    petRef.current.walkTo({ x: target, y: 0 });
  }, []);

  useEffect(() => {
    if (pet.isPlaying || isIdleRef.current) return;

    isIdleRef.current = true;
    positionRef.current = petRef.current.position.x;

    if (Math.random() < 1 / 2) {
      petRef.current.jump();
    } else {
      petRef.current.blink();
    }

    if (walkTimeoutRef.current) clearTimeout(walkTimeoutRef.current);

    const delay = randomBetween(idlePause[0], idlePause[1]);
    walkTimeoutRef.current = setTimeout(() => {
      const target = getRandomTarget(positionRef.current, widthRef.current);
      isIdleRef.current = false;
      petRef.current.walkTo({ x: target, y: 0 });
    }, delay);
  }, [pet.isPlaying, idlePause]);

  return pet;
}
