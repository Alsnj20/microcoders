"use client";

import { useState } from "react";
import { Sign } from "../ui/sign";

const faqs = [
  {
    question: "¿Qué son los Memory Credits (MC)?",
    answer:
      "Los Memory Credits son la unidad de costo interno de MemoryChain. Cubren todo: uso de LLMs, generación de embeddings, cifrado, almacenamiento en IPFS e infraestructura del backend. 1 MC = 0.00001 ETH.",
  },
  {
    question: "¿Mis datos están seguros?",
    answer:
      "Totalmente. Tu información privada nunca toca la blockchain. Se cifra de extremo a extremo y se almacena en IPFS. La blockchain solo guarda hashes verificables (SHA-256) que prueban que los datos son tuyos y no fueron modificados.",
  },
  {
    question: "¿Puedo usar MemoryChain con cualquier modelo de IA?",
    answer:
      "Sí. MemoryChain es compatible con GPT-4o, GPT-4o-mini, Claude Sonnet, Claude Haiku, Gemini Flash y Gemini Pro a través del Vercel AI SDK. No hay vendor lock-in.",
  },
  {
    question: "¿Qué pasa si dejo de pagar?",
    answer:
      "Tus memorias y agentes permanecen en IPFS y la blockchain. No se eliminan nunca. Simplemente no podrás ejecutar nuevos agentes o crear nuevas memorias hasta que compres más MC.",
  },
  {
    question: "¿Necesito saber programar para usar MemoryChain?",
    answer:
      "No. La DApp te permite crear agentes, almacenar memorias y gestionar tu conocimiento desde una interfaz visual. Solo necesitas una wallet (MetaMask) y conex a Arbitrum.",
  },
  {
    question: "¿En qué red está MemoryChain?",
    answer:
      "MemoryChain está construido sobre Arbitrum Stylus, usando contratos escritos en Rust compilados a WASM. Actualmente disponible en testnet (Sepolia) y mainnet (Arbitrum One).",
  },
];

export const FaqSection = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24">
      <div className="px-6 md:px-12 max-w-3xl mx-auto">
        <div className="text-center mb-16 space-y-4">
          <span className="inline-block bg-primary/10 text-primary text-xs font-bold px-4 py-1.5 rounded-full border border-primary/20">
            FAQ
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-foreground tracking-tight">Preguntas frecuentes</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="rounded-xl border border-border/60 bg-card overflow-hidden hover:border-primary/40 transition-colors duration-200"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="text-sm font-semibold text-foreground pr-4">{faq.question}</span>
                <Sign
                  name="lightning"
                  size={20}
                  className={`w-5 h-5 shrink-0 text-primary transition-transform duration-200 ${
                    openIndex === index ? "rotate-45" : ""
                  }`}
                />
              </button>
              {openIndex === index && (
                <div className="px-5 pb-5">
                  <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
