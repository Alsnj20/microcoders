import type { AnimationDefinition, CurrentFrame, PetState } from "../types/pet";
import type { EventBus } from "./event-bus";

export class AnimationController {
  private animations: Map<PetState, AnimationDefinition>;
  private currentAnimation: PetState | null = null;
  private currentFrameIndex = 0;
  private lastFrameTime = 0;
  private playing = false;
  private paused = false;
  private columns: number;
  private frameWidth: number;
  private frameHeight: number;
  private eventBus: EventBus;

  constructor(
    animations: Map<PetState, AnimationDefinition>,
    columns: number,
    frameWidth: number,
    frameHeight: number,
    eventBus: EventBus,
  ) {
    this.animations = animations;
    this.columns = columns;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.eventBus = eventBus;
  }

  play(state: PetState): void {
    const anim = this.animations.get(state);
    if (!anim) return;

    this.currentAnimation = state;
    this.currentFrameIndex = 0;
    this.lastFrameTime = 0;
    this.playing = true;
    this.paused = false;

    this.eventBus.emit("animation:start", { state });
  }

  stop(): void {
    this.playing = false;
    this.paused = false;
    this.currentAnimation = null;
    this.currentFrameIndex = 0;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.lastFrameTime = 0;
  }

  tick(timestamp: number): PetState | null {
    if (!this.playing || this.paused || !this.currentAnimation) return null;

    const anim = this.animations.get(this.currentAnimation);
    if (!anim) return null;

    if (this.lastFrameTime === 0) {
      this.lastFrameTime = timestamp;
      return null;
    }

    const elapsed = timestamp - this.lastFrameTime;
    const frameDuration = 1000 / anim.fps;

    if (elapsed >= frameDuration) {
      this.currentFrameIndex++;
      this.lastFrameTime = timestamp;

      if (this.currentFrameIndex >= anim.frames.length) {
        if (anim.loop) {
          this.currentFrameIndex = 0;
        } else {
          this.playing = false;
          const nextState = anim.next ?? null;
          this.eventBus.emit("animation:complete", {
            state: this.currentAnimation,
            next: nextState,
          });
          return nextState;
        }
      }

      this.eventBus.emit("animation:frame", {
        state: this.currentAnimation,
        frame: this.getCurrentFrame(),
      });
    }

    return null;
  }

  getCurrentFrame(): CurrentFrame | null {
    if (!this.currentAnimation) return null;

    const anim = this.animations.get(this.currentAnimation);
    if (!anim) return null;

    const frameNumber = anim.frames[this.currentFrameIndex];
    const col = (frameNumber - 1) % this.columns;
    const row = Math.floor((frameNumber - 1) / this.columns);

    return {
      index: this.currentFrameIndex,
      frameNumber,
      x: col * this.frameWidth,
      y: row * this.frameHeight,
    };
  }

  getCurrentAnimation(): PetState | null {
    return this.currentAnimation;
  }

  isPlaying(): boolean {
    return this.playing && !this.paused;
  }

  isFinished(): boolean {
    return !this.playing;
  }
}
