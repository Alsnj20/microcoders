"use client";

import Image from "next/image";
import Link from "next/link";
import { Sign } from "../ui/sign";

export const CtaSection = () => {
  return (
    <section className="py-24">
      <div className="px-6 md:px-12 max-w-7xl mx-auto space-y-12">
        {/* Product Screenshot */}
        <div className="relative rounded-2xl border-2 border-border/60 overflow-hidden shadow-2xl bg-card">
          <Image
            src="/chat.png"
            alt="MemoryChain DApp - Chat Interface"
            width={1200}
            height={750}
            className="w-full h-auto"
            priority
          />
        </div>

        {/* CTA Banner */}
        <div className="relative p-10 md:p-16 rounded-3xl bg-primary text-primary-foreground text-center space-y-6 shadow-xl overflow-hidden">
          <div className="absolute top-6 left-8 opacity-20 animate-bounce" style={{ animationDuration: "3s" }}>
            <Sign name="brain" size={64} className="w-12 h-12 md:w-16 md:h-16" />
          </div>
          <div
            className="absolute top-8 right-10 opacity-20 animate-bounce"
            style={{ animationDuration: "4s", animationDelay: "1s" }}
          >
            <Sign name="shield" size={48} className="w-10 h-10 md:w-12 md:h-12" />
          </div>
          <div
            className="absolute bottom-6 left-12 opacity-20 animate-bounce"
            style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}
          >
            <Sign name="chainLink" size={40} className="w-8 h-8 md:w-10 md:h-10" />
          </div>
          <div
            className="absolute bottom-8 right-8 opacity-20 animate-bounce"
            style={{ animationDuration: "4.5s", animationDelay: "1.5s" }}
          >
            <Sign name="sparkleStar" size={32} className="w-8 h-8" />
          </div>

          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-extrabold">Tu agente te esta esperando</h2>
            <p className="text-base md:text-lg opacity-90 max-w-2xl mx-auto">
              Compra tus Memory Credits, crea tu primer agente en minutos y empieza a construir un asistente de IA que
              realmente te conozca.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link
                href="/chat"
                className="bg-background text-foreground text-sm font-semibold px-8 py-4 rounded-xl hover:bg-muted hover:scale-105 transition-all shadow-md flex items-center justify-center gap-2"
              >
                <span>Empezar ahora</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
