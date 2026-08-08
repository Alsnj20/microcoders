"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PetAvatar } from "~~/src/modules/pet/components/pet-avatar";
import { usePet } from "~~/src/modules/pet/hooks/use-pet";

const PET_SIZE = 256;
const SPRITE_SCALE = PET_SIZE / 16;

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export const HeroSection = () => {
  const pet = usePet({ spritesheet: "/sprites/pet.png" });

  // Random jump behavior
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
    <section id="hero" className="px-6 md:px-12 py-24 md:py-32 max-w-7xl mx-auto pt-28">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        {/* Left Content */}
        <div className="flex flex-col items-start text-left">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>Protocolo descentralizado en Arbitrum Stylus</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl md:text-6xl font-extrabold leading-tight tracking-tight text-foreground mb-6">
            El usuario no es dueño de sus{" "}
            <span className="text-primary underline decoration-primary/30 underline-offset-8">memorias.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl leading-relaxed text-muted-foreground max-w-xl mb-10">
            MemoryChain devuelve el control a los usuarios. Almacena, conecta y protege tus memorias con tecnología
            descentralizada.
          </p>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-start w-full sm:w-auto mb-12">
            <Link
              href="/chat"
              className="bg-primary text-primary-foreground text-base font-semibold px-8 py-4 rounded-xl hover:opacity-90 transition-all duration-200 shadow-lg hover:shadow-primary/25 active:scale-95 text-center flex items-center justify-center gap-2"
            >
              <span>Comenzar ahora</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </Link>

            <a
              href="#architecture"
              className="bg-card text-foreground text-base font-semibold px-8 py-4 rounded-xl border border-border/80 hover:border-primary/50 hover:bg-muted/50 transition-all duration-200 active:scale-95 text-center flex items-center justify-center gap-2"
            >
              <span>Ver cómo funciona</span>
              <span className="material-symbols-outlined text-lg">play_arrow</span>
            </a>
          </div>

          {/* Features Inline */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">shield</span>
              <span>Privado por diseño</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">lock</span>
              <span>Cifrado de extremo a extremo</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">currency_bitcoin</span>
              <span>Arbitrum Stylus</span>
            </div>
          </div>
        </div>

        {/* Right Content - Illustration */}
        <div className="flex justify-center lg:justify-end">
          <div className="relative w-full max-w-lg aspect-square flex items-center justify-center">
            {/* Decorative Grid Background */}
            <div className="absolute inset-0 opacity-20">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: "radial-gradient(circle, var(--primary) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
            </div>

            {/* Main Pet Illustration */}
            <div className="relative z-10 w-64 h-64 md:w-80 md:h-80 rounded-3xl bg-primary/10 border-2 border-primary/30 flex items-center justify-center shadow-2xl">
              <PetAvatar
                spritesheet="/sprites/pet.png"
                currentState={pet.currentState}
                currentFrame={pet.currentFrame}
                position={{ x: 0, y: 0 }}
                frameWidth={16}
                frameHeight={16}
                scale={SPRITE_SCALE}
                positionMode="relative"
                onClick={pet.onClick}
                onHover={pet.onHover}
              />
            </div>

            {/* Floating Elements */}
            <div
              className="absolute top-10 left-10 w-16 h-16 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center animate-bounce"
              style={{ animationDuration: "3s" }}
            >
              <span className="material-symbols-outlined text-2xl text-primary">lock</span>
            </div>

            <div
              className="absolute bottom-10 right-10 w-16 h-16 rounded-2xl bg-card border border-border shadow-lg flex items-center justify-center animate-bounce"
              style={{ animationDuration: "4s", animationDelay: "1s" }}
            >
              <span className="material-symbols-outlined text-2xl text-primary">document_scanner</span>
            </div>

            <div
              className="absolute top-1/2 -right-4 w-12 h-12 rounded-xl bg-card border border-border shadow-lg flex items-center justify-center animate-bounce"
              style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}
            >
              <span className="material-symbols-outlined text-xl text-primary">currency_bitcoin</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
