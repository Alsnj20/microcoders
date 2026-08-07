"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PetAvatar } from "~~/src/modules/pet/components/pet-avatar";
import { usePet } from "~~/src/modules/pet/hooks/use-pet";

const PET_SIZE = 32;
const SPRITE_SCALE = PET_SIZE / 16;


function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pet = usePet({ spritesheet: "/sprites/pet.png" });

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

  const navLinks = [
    { name: "Inicio", href: "#hero" },
    { name: "Arquitectura", href: "#architecture" },
    { name: "Características", href: "#features" },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
      <div className="flex justify-between items-center h-20 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 font-semibold text-xl tracking-tight text-primary">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shadow-sm">
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
          <div className="flex flex-col">
            <span className="leading-none text-lg font-bold text-foreground">MemoryChain</span>
            <span className="text-xs text-muted-foreground font-normal">Arbitrum Stylus</span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {link.name}
            </a>
          ))}
        </div>

        {/* Action Button & Mobile Toggle */}
        <div className="flex items-center gap-4">
          <Link
            href="/chat"
            className="bg-primary text-primary-foreground text-sm font-semibold px-6 py-3 rounded-lg hover:opacity-90 transition-all duration-200 shadow-md hover:shadow-primary/20 active:scale-95 hidden sm:inline-flex items-center gap-2"
          >
            <span>Conectar Wallet</span>
            <span className="material-symbols-outlined text-base">account_balance_wallet</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-primary hover:bg-accent rounded-lg transition-colors"
            aria-label="Toggle Navigation"
          >
            <span className="material-symbols-outlined">{isMobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-b border-border/40 bg-background/95 backdrop-blur-xl px-6 py-6 flex flex-col gap-4 shadow-xl">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-base font-medium text-foreground hover:text-primary py-2 transition-colors border-b border-border/10"
            >
              {link.name}
            </a>
          ))}
          <Link
            href="/chat"
            onClick={() => setIsMobileMenuOpen(false)}
            className="bg-primary text-primary-foreground text-center font-semibold py-3.5 rounded-lg mt-2 shadow-md text-sm flex items-center justify-center gap-2"
          >
            <span>Conectar Wallet</span>
            <span className="material-symbols-outlined text-base">account_balance_wallet</span>
          </Link>
        </div>
      )}
    </nav>
  );
};
