import type { PetState, QueueItem } from "../types/pet";

export class AnimationQueue {
  private queue: QueueItem[] = [];
  private current: QueueItem | null = null;

  enqueue(item: QueueItem): void {
    if (this.current?.state === item.state && !item.interruptible) return;

    this.queue.push(item);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  dequeue(): QueueItem | null {
    const item = this.queue.shift() ?? null;
    if (item) this.current = item;
    return item;
  }

  interrupt(newState: PetState, priority: number): void {
    this.current = null;
    this.queue = this.queue.filter(item => !item.interruptible || item.priority > priority);

    this.enqueue({
      state: newState,
      priority,
      interruptible: true,
    });
  }

  peek(): QueueItem | null {
    return this.queue[0] ?? null;
  }

  clear(): void {
    this.queue = [];
    this.current = null;
  }

  isEmpty(): boolean {
    return this.queue.length === 0;
  }

  getCurrent(): QueueItem | null {
    return this.current;
  }

  setCurrent(item: QueueItem | null): void {
    this.current = item;
  }
}
