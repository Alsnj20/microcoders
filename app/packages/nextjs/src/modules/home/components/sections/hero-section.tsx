"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { PetAvatar } from "~~/src/modules/pet/components/pet-avatar";
import { usePet } from "~~/src/modules/pet/hooks/use-pet";
import { Sign } from "../ui/sign";

const TYPING_TEXT = "TUS DATOS.\nTUS MEMORIAS.\nTU CONTROL.";

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export const HeroSection = () => {
  const pet = usePet({ spritesheet: "/sprites/pet.png" });
  const heroRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  // Typing animation that restarts on scroll into view
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;

    let cleanup: (() => void) | null = null;

    const startTyping = () => {
      cleanup?.();
      setTyped("");
      setShowCursor(true);

      let i = 0;
      const interval = setInterval(() => {
        if (i <= TYPING_TEXT.length) {
          setTyped(TYPING_TEXT.slice(0, i));
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setShowCursor(false), 2000);
        }
      }, 50);

      cleanup = () => clearInterval(interval);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startTyping();
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    startTyping();

    return () => {
      cleanup?.();
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const scheduleJump = () => {
      const delay = randomBetween(2000, 8000);
      return setTimeout(() => {
        if (Math.random() > 0.5) {
          pet.jump();
        } else {
          pet.blink();
        }
        timerId = scheduleJump();
      }, delay);
    };

    let timerId = scheduleJump();
    return () => clearTimeout(timerId);
  }, [pet.jump, pet.blink]);

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative px-6 md:px-12 py-24 md:py-32 max-w-7xl mx-auto pt-28 grid place-content-center overflow-hidden"
    >
      {/* Grid background */}
      <div
        className="absolute -left-2 -right-2 inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(39,63,43,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(39,63,43,0.09) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative w-full lg:w-4xl grid lg:grid-cols-1 gap-12 lg:gap-16 items-center place-content-center">
        {/* Left Content */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Protocolo en Arbitrum Stylus</span>
          </div>

          <h1 className="text-5xl md:text-8xl font-extrabold leading-tight tracking-tight mb-6">
            {typed.split("\n").map((line, i) => (
              <span key={i} className={i === 0 ? "text-foreground" : i === 1 ? "text-foreground/90" : "text-primary underline decoration-primary/30 underline-offset-8 transition-opacity duration-500"}>
                {line}
                {i < typed.split("\n").length - 1 && <br />}
              </span>
            ))}
            {showCursor && (
              <span
                className="inline-block w-[3px] h-[0.9em] bg-primary ml-1 align-middle"
                style={{ animation: "blink-caret 0.75s step-end infinite" }}
              />
            )}
          </h1>

          <p className="text-lg md:text-xl leading-relaxed text-muted-foreground max-w-xl mb-10">
            MemoryChain guarda tu conocimiento de forma segura y lo conecta con cualquier agente de IA. Es tuyo.
            Siempre.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-start w-full sm:w-auto mb-12">
            <Link
              href="/chat"
              className="bg-primary text-primary-foreground text-base font-semibold px-8 py-4 rounded-xl hover:opacity-90 hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-primary/25 active:scale-95 text-center flex items-center justify-center gap-2"
            >
              <span>Crea tu primer agente</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>

            <a
              href="#how-it-works"
              className="bg-card text-foreground text-base font-semibold px-8 py-4 rounded-xl border border-border/80 hover:border-primary/50 hover:bg-muted/50 hover:scale-105 transition-all duration-200 active:scale-95 text-center flex items-center justify-center gap-2"
            >
              <span>Ver cómo funciona</span>
              <span className="material-symbols-outlined text-lg">play_arrow</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Sign name="shield" size={20} className="opacity-70" />
              <span>Privado por diseño</span>
            </div>
            <div className="flex items-center gap-2">
              <Sign name="encryption" size={20} className="opacity-70" />
              <span>Cifrado de extremo a extremo</span>
            </div>
            <div className="flex items-center gap-2">
              <Sign name="chainLink" size={20} className="opacity-70" />
              <span>100% descentralizado</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key icons - mirror */}
      <div className="absolute top-1/2 left-2 md:left-2 lg:left-1/7 z-10 rotate-25">
        <Sign name="key" size={48} className="w-10 h-10 md:w-25 md:h-30" />
      </div>

      <div
        className="absolute top-1/2 right-2 md:right-2 lg:right-1/7 z-10 -rotate-25"
        style={{ transform: "scaleX(-1)" }}
      >
        <Sign name="key" size={48} className="w-10 h-10 md:w-25 md:h-30" />
      </div>
    </section>
  );
};
