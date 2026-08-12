"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import type { SignKey } from "../../constants/signs";
import { Sign } from "../ui/sign";

interface PricingPlan {
  name: string;
  mc: number;
  eth: string;
  sign: SignKey;
  popular?: boolean;
  features: string[];
  cta: string;
}

const plans: PricingPlan[] = [
  {
    name: "Starter",
    mc: 50,
    eth: "0.005",
    sign: "creditsCoin",
    features: ["5 agentes personales", "50 memorias", "Ejecuciones limitadas", "Soporte comunitario"],
    cta: "Empezar",
  },
  {
    name: "Creator",
    mc: 100,
    eth: "0.01",
    sign: "brain",
    popular: true,
    features: [
      "25 agentes personales",
      "250 memorias",
      "Ejecuciones ilimitadas",
      "Soporte prioritario",
      "Acceso anticipado a features",
    ],
    cta: "Empezar",
  },
  {
    name: "Pro",
    mc: 200,
    eth: "0.02",
    sign: "aiAgent",
    features: [
      "Agentes ilimitados",
      "Memorias ilimitadas",
      "Ejecuciones ilimitadas",
      "Soporte dedicado",
      "API access",
      "Custom integrations",
    ],
    cta: "Empezar",
  },
];

export const PricingSection = () => {
  return (
    <section id="pricing" className="py-24">
      <div className="px-6 md:px-12 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full border border-primary/20">
            MEMORY CREDITS
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">Elige tu plan</h2>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Los Memory Credits cubren todo: LLMs, embeddings, cifrado, IPFS y más. Compra, activa y usa tus créditos en segundos. No hay contratos, no hay ataduras. Cambia de plan cuando quieras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto ">
          {plans.map(plan => (
            <Link key={plan.name} href="/chat" className="block">
              <Card
                className={`relative flex flex-col h-full cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular
                    ? "border-primary shadow-md shadow-primary/10 md:scale-105"
                    : "border-border/60 hover:border-primary/80"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1">Más popular</Badge>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sign name={plan.sign} size={48} className="w-10 h-10" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold text-foreground">{plan.mc}</span>
                    <span className="text-lg text-muted-foreground ml-1">MC</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.eth} ETH</p>
                </CardHeader>

                <CardContent className="flex-1">
                  <ul className="space-y-3">
                    {plan.features.map(feature => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Sign name="check" size={16} className="w-4 h-4 text-primary shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <div
                    className={`w-full py-3 rounded-xl text-sm font-semibold text-center transition-all duration-200 ${
                      plan.popular
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-card text-foredisground border border-border/80 group-hover:border-primary/50 hover:bg-primary/30"
                    }`}
                  >
                    {plan.cta}
                  </div>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8">
          1 MC = 0.00001 ETH. Gas de Arbitrum no incluido.
        </p>
      </div>
    </section>
  );
};
