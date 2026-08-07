import type { AnimationDefinition, PetState } from "../types/pet";

export const ANIMATIONS: Record<PetState, AnimationDefinition> = {
  idle: {
    frames: [1],
    fps: 1,
    loop: true,
  },
  blink: {
    frames: [1, 2, 3, 2, 1],
    fps: 12,
    loop: false,
    next: "idle",
  },
  walk: {
    frames: [5, 6, 7, 8, 5],
    fps: 16,
    loop: true,
  },
  jump: {
    frames: [9, 10, 11, 10, 9, 12, 9, 9, 9, 10, 11, 10, 9, 12, 9],
    fps: 24,
    loop: false,
    next: "idle",
  },
};

export const ANIMATION_PRIORITIES: Record<PetState, number> = {
  idle: 0,
  blink: 1,
  walk: 3,
  jump: 4,
};
