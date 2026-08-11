"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAccount } from "wagmi";
import { useGlobalState } from "~~/services/store/store";
import { ConnectWallet } from "~~/src/modules/auth/components/ConnectWallet";
import { ThemeToggle } from "~~/src/modules/home/components/ui/theme-toggle";
import { RainbowKitCustomConnectButton } from "../scaffold-eth";

const NAV_LINKS = [
  { name: "Chat", href: "/chat" },
  { name: "Agentes", href: "/agents" },
  { name: "Memorias", href: "/memories" },
  { name: "Perfil", href: "/profile" },
];

export function SharedAppHeader() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { session } = useGlobalState();
  const { creditBalance } = useGlobalState();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className="min-w-dvw fixed top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
      <div className="flex justify-between items-center h-20 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 font-semibold text-xl tracking-tight text-primary">
          <div className="flex flex-col leading-none">
            <h1 className="text-primary text-2xl -mb-2">
              M<span className="leading-none text-xl font-bold text-foreground">chain</span>
            </h1>
            <span className="text-xs text-muted-foreground font-normal -mt-2">Arbitrum Stylus</span>
          </div>
        </Link>

        {/* Nav Links */}
        <div className="hidden lg:flex items-center gap-8">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-md transition-colors duration-200 ${
                isActive(link.href) ? "font-medium text-primary" : "text-muted-foreground hover:text-primary"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

           {isConnected && session.isAuthenticated && (
            <Link
              href="/profile"
              className="text-xs font-mono border border-2 border-primary/40 hover:border-primary px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
            >
              <span className="material-symbols-outlined text-primary">token</span>
              <span className="font-bold text-primary">{creditBalance} MC</span>
            </Link>
          )}
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

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-b border-border/40 bg-background/95 backdrop-blur-xl px-6 py-6 flex flex-col gap-4 shadow-xl">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`text-base font-medium py-2 transition-colors border-b border-border/10 ${
                isActive(link.href) ? "text-primary" : "text-foreground hover:text-primary"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
