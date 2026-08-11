"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SignKey } from "../../constants/signs";
import { Sign } from "../ui/sign";

interface UseCase {
  sign: SignKey;
  title: string;
  description: string;
  quote: string;
}

const useCases: UseCase[] = [
  {
    sign: "user",
    title: "Asistente Personal",
    description: "Tu agente recuerda tus preferencias, horarios y hábitos entre cada conversación.",
    quote: "¿Sabías que me gusta el café sin azúcar? Me lo recordaste la última vez.",
  },
  {
    sign: "code",
    title: "Desarrollador",
    description: "Tu agente conoce tu stack, tus bugs favoritos y tu estilo de código.",
    quote: "Siempre me recuerdas que uso TypeScript con Next.js. Gracias.",
  },
  {
    sign: "search",
    title: "Investigador",
    description: "Tus notas se conectan con papers y nunca perdés el contexto de tu investigación.",
    quote: "Conectaste mis apuntes de la universidad con los papers que leí.",
  },
  {
    sign: "brain",
    title: "Creador de Contenido",
    description: "Tu agente recuerda tu estilo, tu audiencia y lo que funciona.",
    quote: "Sabés que mis reels con preguntas generan más interacción.",
  },
  {
    sign: "network",
    title: "Equipo",
    description: "Compartes conocimiento entre agentes sin duplicar datos entre tú y tu equipo.",
    quote: "Nuestros agentes comparten el contexto del proyecto sin perder privacidad.",
  },
];

export const UseCasesSection = () => {
  const doubled = [...useCases, ...useCases];

  return (
    <section className="py-24 bg-card border-y border-border/40 overflow-hidden">
      <div className="px-6 md:px-12 max-w-7xl mx-auto mb-12">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full border border-primary/20">
            CASOS DE USO
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">
            Para todos los que construyen con IA
          </h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            MemoryChain se adapta a tu forma de trabajar. Estos son solo algunos ejemplos.
          </p>
        </div>
      </div>

      {/* Auto-scrolling marquee */}
      <div className="relative">
        {/* Gradient fades */}
        <div className="absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />

        <div className="flex gap-6 marquee-track">
          {doubled.map((useCase, index) => (
            <Card
              key={`${useCase.title}-${index}`}
              className="min-w-[300px] max-w-[340px] shrink-0 border-border/60 hover:border-primary/50 transition-all duration-300 hover:shadow-md"
            >
              <CardHeader>
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-2 group-hover:bg-primary/20 transition-colors">
                  <Sign name={useCase.sign} size={48} className="w-10 h-10" />
                </div>
                <CardTitle className="text-lg">{useCase.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">{useCase.description}</p>
                <div className="p-3 rounded-xl bg-muted/50 border border-border/40">
                  <p className="text-xs text-muted-foreground italic leading-relaxed">&ldquo;{useCase.quote}&rdquo;</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
