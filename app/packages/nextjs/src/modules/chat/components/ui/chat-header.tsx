"use client";

import Link from "next/link";

interface ChatHeaderProps {
  activeAgentName?: string;
  memoryStatus?: string;
}

export function ChatHeader({
  activeAgentName = "Trading Assistant",
  memoryStatus = "Verificado (SHA-256)",
}: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/90 border-b border-border/60 backdrop-blur-md flex justify-between items-center w-full px-6 h-16 shadow-sm">
      {/* Brand & Active Agent Indicator */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground font-semibold hover:text-primary transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-xl">hub</span>
          </div>
          <span className="font-bold text-lg hidden sm:inline">MemoryChain</span>
        </Link>

        <span className="text-border text-lg hidden sm:inline">/</span>

        <div className="flex items-center gap-2 bg-muted/60 px-3 py-1.5 rounded-lg border border-border/40">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-foreground">{activeAgentName}</span>
          <span className="text-xs text-muted-foreground hidden md:inline">({memoryStatus})</span>
        </div>
      </div>

      {/* Navigation & Context Action */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <span className="text-primary font-bold border-b-2 border-primary pb-0.5">Chat Active</span>
          <a href="#agentes" className="hover:text-foreground transition-colors">Agentes</a>
          <a href="#memoria" className="hover:text-foreground transition-colors">Contexto</a>
        </div>

        <Link
          href="/"
          className="text-xs font-semibold px-4 py-2 rounded-lg bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-all border border-border/50 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-sm">home</span>
          <span>Volver al Inicio</span>
        </Link>
      </div>
    </header>
  );
}
