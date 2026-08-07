"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ANIMATIONS, ANIMATION_PRIORITIES } from "../animations/definitions";
import { AnimationController } from "../engine/animation-controller";
import { AnimationQueue } from "../engine/animation-queue";
import { EventBus } from "../engine/event-bus";
import { PetStateMachine } from "../engine/state-machine";
import type {
  CurrentFrame,
  PetPosition,
  PetState,
  PetStats,
  UsePetConfig,
  UsePetReturn,
  WalkTarget,
} from "../types/pet";
import { useAnimationLoop } from "./use-animation-loop";

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export function usePet(config: UsePetConfig): UsePetReturn {
  const {
    spritesheet,
    frameWidth = 16,
    frameHeight = 16,
    columns = 4,
    totalFrames = 16,
    autoBlink = true,
    blinkInterval = [8000, 15000],
    speed = 1,
  } = config;

  const [currentState, setCurrentState] = useState<PetState>("idle");
  const [currentFrame, setCurrentFrame] = useState<CurrentFrame | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState<PetPosition>({ x: 0, y: 0 });
  const [stats] = useState<PetStats>({ happiness: 50, hunger: 50, energy: 50 });

  const walkTargetRef = useRef<WalkTarget | null>(null);
  const walkRafRef = useRef<number>(0);
  const positionRef = useRef<PetPosition>({ x: 0, y: 0 });

  const eventBus = useMemo(() => new EventBus(), []);
  const stateMachine = useMemo(() => new PetStateMachine(), []);
  const queue = useMemo(() => new AnimationQueue(), []);
  const controller = useMemo(
    () =>
      new AnimationController(
        new Map(Object.entries(ANIMATIONS)) as Map<PetState, (typeof ANIMATIONS)[PetState]>,
        columns,
        frameWidth,
        frameHeight,
        eventBus,
      ),
    [columns, frameWidth, frameHeight, eventBus],
  );

  useAnimationLoop(controller);

  const stopWalkLoop = useCallback(() => {
    if (walkRafRef.current) {
      cancelAnimationFrame(walkRafRef.current);
      walkRafRef.current = 0;
    }
  }, []);

  const play = useCallback(
    (state: PetState) => {
      if (!stateMachine.canTransition(state)) {
        queue.interrupt(state, ANIMATION_PRIORITIES[state]);
        return;
      }

      stateMachine.transition(state);
      controller.play(state);
      setCurrentState(state);
      setIsPlaying(true);
    },
    [stateMachine, controller, queue],
  );

  const jump = useCallback(() => play("jump"), [play]);
  const blink = useCallback(() => play("blink"), [play]);

  const stop = useCallback(() => {
    stopWalkLoop();
    walkTargetRef.current = null;
    controller.stop();
    stateMachine.transition("idle");
    setCurrentState("idle");
    setIsPlaying(false);
    setCurrentFrame(null);
  }, [controller, stateMachine, stopWalkLoop]);

  const startWalkLoop = useCallback(
    (target: WalkTarget) => {
      stopWalkLoop();

      const step = () => {
        const current = positionRef.current;
        const dx = target.x - current.x;

        if (Math.abs(dx) < speed) {
          positionRef.current = { x: target.x, y: target.y };
          setPosition({ x: target.x, y: target.y });
          walkTargetRef.current = null;
          stop();
          return;
        }

        const dir = dx > 0 ? speed : -speed;
        const newX = current.x + dir;
        positionRef.current = { x: newX, y: current.y };
        setPosition({ x: newX, y: current.y });
        walkRafRef.current = requestAnimationFrame(step);
      };

      walkRafRef.current = requestAnimationFrame(step);
    },
    [speed, stop, stopWalkLoop],
  );

  const walkTo = useCallback(
    (target: WalkTarget) => {
      walkTargetRef.current = target;
      positionRef.current = { ...position };
      play("walk");
      startWalkLoop(target);
    },
    [play, position, startWalkLoop],
  );

  const onClick = useCallback(() => {
    jump();
  }, [jump]);

  const onHover = useCallback(() => {
    blink();
  }, [blink]);

  const reset = useCallback(() => {
    stop();
    stateMachine.reset();
    setPosition({ x: 0, y: 0 });
    positionRef.current = { x: 0, y: 0 };
    walkTargetRef.current = null;
  }, [stop, stateMachine]);

  useEffect(() => {
    const unsubComplete = eventBus.on<{ state: PetState; next: PetState | null }>(
      "animation:complete",
      ({ state, next }) => {
        setIsPlaying(false);
        if (next) {
          play(next);
        } else {
          stateMachine.transition("idle");
          setCurrentState("idle");
        }
      },
    );

    const unsubFrame = eventBus.on<{ state: PetState; frame: CurrentFrame }>("animation:frame", ({ frame }) => {
      setCurrentFrame(frame);
    });

    return () => {
      unsubComplete();
      unsubFrame();
    };
  }, [eventBus, play, stateMachine]);

  useEffect(() => {
    if (!autoBlink || currentState !== "idle") return;

    const timeout = setTimeout(
      () => {
        blink();
      },
      randomBetween(blinkInterval[0], blinkInterval[1]),
    );

    return () => clearTimeout(timeout);
  }, [currentState, autoBlink, blinkInterval, blink]);

  useEffect(() => {
    return () => {
      stopWalkLoop();
    };
  }, [stopWalkLoop]);

  return {
    currentState,
    currentFrame,
    isPlaying,
    position,
    stats,
    play,
    jump,
    blink,
    walkTo,
    stop,
    onClick,
    onHover,
    reset,
  };
}
