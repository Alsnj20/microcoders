"use client";

import Link from "next/link";

export const FooterSection = () => {
  return (
    <footer className="w-full py-16 bg-muted/60 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 font-bold text-xl text-foreground">
            <span className="material-symbols-outlined text-primary">hub</span>
            <span>MemoryChain</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MemoryChain Protocol. El protocolo descentralizado para la propiedad del conocimiento en IA.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
          <a href="#architecture" className="hover:text-primary transition-colors">
            Arquitectura
          </a>
          <a href="#contracts" className="hover:text-primary transition-colors">
            Stylus Contracts
          </a>
          <a href="#credits" className="hover:text-primary transition-colors">
            Memory Credits
          </a>
          <Link href="/chat" className="hover:text-primary transition-colors font-semibold text-primary">
            DApp Chat
          </Link>
        </div>
      </div>
    </footer>
  );
};
