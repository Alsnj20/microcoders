export type PetState = "idle" | "blink" | "walk" | "jump";

export interface AnimationDefinition {
  frames: number[];
  fps: number;
  loop: boolean;
  next?: PetState;
  onComplete?: () => void;
}

export interface CurrentFrame {
  index: number;
  frameNumber: number;
  x: number;
  y: number;
}

export interface PetStats {
  happiness: number;
  hunger: number;
  energy: number;
}

export interface PetPosition {
  x: number;
  y: number;
}

export interface SpriteSheetConfig {
  src: string;
  frameWidth: number;
  frameHeight: number;
  columns: number;
  totalFrames: number;
}

export interface WalkTarget {
  x: number;
  y: number;
}

export type PetEvent =
  | { type: "click" }
  | { type: "hover" }
  | { type: "walkTo"; target: WalkTarget }
  | { type: "stop" };

export interface QueueItem {
  state: PetState;
  priority: number;
  interruptible: boolean;
}

export interface UsePetConfig {
  spritesheet: string;
  frameWidth?: number;
  frameHeight?: number;
  columns?: number;
  totalFrames?: number;
  autoBlink?: boolean;
  blinkInterval?: [number, number];
  speed?: number;
}

export interface UsePetReturn {
  currentState: PetState;
  currentFrame: CurrentFrame | null;
  isPlaying: boolean;
  position: PetPosition;
  stats: PetStats;
  play: (state: PetState) => void;
  jump: () => void;
  blink: () => void;
  walkTo: (target: WalkTarget) => void;
  stop: () => void;
  onClick: () => void;
  onHover: () => void;
  reset: () => void;
}
