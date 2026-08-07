"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SharedBotAvatar } from "./SharedBotAvatar";

const NAV_LINKS = [
  { name: "Chat", href: "/chat" },
  { name: "Memorias", href: "/memories" },
  { name: "Agentes", href: "/agents" },
];

export function SharedAppHeader() {
  const pathname = usePathname();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className="w-full z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
      <div className="flex justify-between items-center h-16 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
            <SharedBotAvatar size="sm" />
          </div>
          <span>MemoryChain</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                isActive(link.href)
                  ? "font-medium text-foreground border-b-2 border-primary pb-0.5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-lg hidden sm:inline">
            0x8a7B...3cF2
          </span>
          <button
            type="button"
            className="py-2 px-4 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/90 transition-all border border-border"
          >
            Conectar Wallet
          </button>
        </div>
      </div>
    </nav>
  );
}
