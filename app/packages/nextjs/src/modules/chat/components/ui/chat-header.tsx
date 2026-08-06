"use client";

import Link from "next/link";

interface ChatHeaderProps {
  activeAgentName?: string;
}

export function ChatHeader({ activeAgentName = "Trading Bot" }: ChatHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-background/90 border-b border-border/80  backdrop-blur-md flex justify-between items-center w-full px-6 h-16">
      <Link
        href="/"
        className="font-['Source_Serif_4'] text-xl font-medium tracking-tight text-foreground flex items-center gap-2 hover:opacity-90 transition-opacity"
      >
        <span className="material-symbols-outlined text-3xl text-primary">hub</span>
        <span>MemoryChain</span>
      </Link>

      {/* Contextual Navigation */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex space-x-6">
          <Link href="/chat" className="text-primary font-bold border-b-2 border-primary pb-1 text-sm">
            Chats
          </Link>
          <Link href="/chat#agentes" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
            Agentes ({activeAgentName})
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-input text-foreground border border-border hover:bg-surface-container-high transition-colors"
        >
          Inicio
        </Link>
      </div>
    </header>
  );
}
