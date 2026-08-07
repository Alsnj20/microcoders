import type { PetState } from "../types/pet";

const TRANSITIONS: Record<PetState, PetState[]> = {
  idle: ["blink", "walk", "jump"],
  blink: ["idle"],
  walk: ["idle", "jump"],
  jump: ["idle", "walk"],
};

export class PetStateMachine {
  private state: PetState = "idle";
  private history: PetState[] = [];

  transition(newState: PetState): boolean {
    if (!this.canTransition(newState)) return false;

    this.history.push(this.state);
    if (this.history.length > 20) this.history.shift();

    this.state = newState;
    return true;
  }

  getState(): PetState {
    return this.state;
  }

  canTransition(to: PetState): boolean {
    return TRANSITIONS[this.state]?.includes(to) ?? false;
  }

  getHistory(): PetState[] {
    return [...this.history];
  }

  reset(): void {
    this.state = "idle";
    this.history = [];
  }
}
