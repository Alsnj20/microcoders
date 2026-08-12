"use client";

import Link from "next/link";
import { useState } from "react";
import { usePet } from "~~/src/modules/pet/hooks/use-pet";
import { ThemeToggle } from "./theme-toggle";

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pet = usePet({ spritesheet: "/sprites/pet.png", autoBlink: true, blinkInterval: [4000, 8000] });

  const navLinks = [
    { name: "Inicio", href: "#hero" },
    { name: "Cómo funciona", href: "#how-it-works" },
    { name: "Caracteristicas", href: "#features" },
    { name: "Precios", href: "#pricing" },
    { name: "FAQ", href: "#faq" },
  ];

  return (
    <nav className="min-w-dvw fixed top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
      <div className="flex justify-between items-center h-20 px-6 md:px-12 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-3 font-semibold text-xl tracking-tight text-primary">
          <div className="flex flex-col leading-none">
            <h1 className="text-primary text-2xl -mb-2">
              M<span className="leading-none text-xl font-bold text-foreground">chain</span>
            </h1>
            <span className="text-xs text-muted-foreground font-normal -mt-2">Arbitrum Stylus</span>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map(link => (
            <a
              key={link.name}
              href={link.href}
              className="text-md text-muted-foreground hover:text-primary transition-colors duration-200"
            >
              {link.name}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
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
            className="lg:hidden p-2 text-primary hover:text-primary/70 rounded-lg transition-colors"
            aria-label="Toggle Navigation"
          >
            <span className="material-symbols-outlined">{isMobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="lg:hidden border-b border-border/40 bg-background/95 backdrop-blur-xl px-6 py-6 flex flex-col gap-4 shadow-xl">
          {navLinks.map(link => (
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
