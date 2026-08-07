"use client";

import { MemoriesPage } from "~~/src/modules/memories";

export default function MemoriesRoute() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <nav className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
        <div className="flex justify-between items-center h-16 px-6 md:px-12 max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <a href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
              <span className="text-2xl">👾</span>
              <span>MemoryChain</span>
            </a>
            <div className="hidden md:flex items-center gap-6">
              <a href="/chat" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Chat
              </a>
              <a href="/memories" className="text-sm font-medium text-foreground border-b-2 border-primary pb-0.5">
                Memorias
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Agentes
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Créditos
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Ajustes
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
              0x8a7B...3cF2
            </span>
          </div>
        </div>
      </nav>

      <MemoriesPage />
    </div>
  );
}
