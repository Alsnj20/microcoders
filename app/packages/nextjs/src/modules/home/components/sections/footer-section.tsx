"use client";

import Link from "next/link";
import { Sign } from "../ui/sign";

export const FooterSection = () => {
  return (
    <footer className="w-full py-16 bg-muted/60 border-t border-border/50">
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="space-y-2 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 font-bold text-xl text-foreground">
            <Sign name="chainLink" size={24} className="w-6 h-6 text-primary" />
            <span>MemoryChain</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} MemoryChain Protocol. El protocolo descentralizado para la propiedad del
            conocimiento en IA.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
          <a href="#how-it-works" className="hover:text-primary transition-colors">
            Cómo funciona
          </a>
          <a href="#features" className="hover:text-primary transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-primary transition-colors">
            Pricing
          </a>
          <a href="#faq" className="hover:text-primary transition-colors">
            FAQ
          </a>
          <Link href="/chat" className="hover:text-primary transition-colors font-semibold text-primary">
            DApp Chat
          </Link>
        </div>
      </div>
    </footer>
  );
};
