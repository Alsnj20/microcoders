"use client";

import { useCallback, useEffect, useRef } from "react";
import type { AnimationController } from "../engine/animation-controller";

export function useAnimationLoop(controller: AnimationController | null) {
  const rafRef = useRef<number>(0);
  const runningRef = useRef(false);

  const loop = useCallback(
    (timestamp: number) => {
      if (!controller) return;

      controller.tick(timestamp);
      rafRef.current = requestAnimationFrame(loop);
    },
    [controller],
  );

  const start = useCallback(() => {
    if (runningRef.current || !controller) return;
    runningRef.current = true;
    rafRef.current = requestAnimationFrame(loop);
  }, [controller, loop]);

  const stop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
  }, []);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  return { start, stop };
}
