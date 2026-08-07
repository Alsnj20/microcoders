"use client";

import { useCallback } from "react";
import { User } from "lucide-react";
import { PetAvatar } from "~~/src/modules/pet/components/pet-avatar";
import { usePet } from "~~/src/modules/pet/hooks/use-pet";
import type { Agent, AgentChatMessage } from "../../types/agent";

const PET_SIZE = 32;
const SPRITE_SCALE = PET_SIZE / 16;

interface AgentChatProps {
  agent: Agent | null;
  messages: AgentChatMessage[];
  onSendMessage: (content: string) => void;
}

function BotAvatar() {
  const pet = usePet({ spritesheet: "/sprites/pet.png" });

  return (
    <div
      className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 cursor-pointer overflow-hidden"
      onMouseEnter={pet.blink}
      onClick={pet.jump}
    >
      <PetAvatar
        spritesheet="/sprites/pet.png"
        currentState={pet.currentState}
        currentFrame={pet.currentFrame}
        position={{ x: 0, y: 0 }}
        frameWidth={16}
        frameHeight={16}
        scale={SPRITE_SCALE}
        positionMode="relative"
      />
    </div>
  );
}

export function AgentChat({ agent, messages, onSendMessage }: AgentChatProps) {
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const input = form.elements.namedItem("message") as HTMLInputElement;
      if (input.value.trim()) {
        onSendMessage(input.value);
        input.value = "";
      }
    },
    [onSendMessage],
  );

  return (
    <div className="flex-1 flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-border/40 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden cursor-pointer"
            onMouseEnter={() => {}}
          >
            <BotAvatar />
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{agent?.name || "Selecciona un agente"}</h2>
            <p className="text-xs text-muted-foreground">{agent?.model} • {agent?.tools.length || 0} herramientas</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4 cursor-pointer" onClick={() => {}}>
              <BotAvatar />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              ¿Cómo puedo ayudarte hoy?
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {agent?.description || "Selecciona un agente o inicia una nueva conversación."}
            </p>
            <div className="flex flex-wrap gap-2 mt-6 justify-center">
              {agent?.tools.map((tool) => (
                <span
                  key={tool}
                  className="px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground font-medium"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && <BotAvatar />}
              <div
                className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted text-foreground rounded-bl-md"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-xs mt-1 ${msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {msg.timestamp}
                </p>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/40 bg-background/95 backdrop-blur-sm">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            name="message"
            type="text"
            placeholder="Escribe tu mensaje..."
            className="flex-1 px-4 py-3 rounded-xl border border-border/60 bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
          <button
            type="submit"
            className="p-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-xl">arrow_upward</span>
          </button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Tus mensajes y memorias están cifrados de extremo a extremo.
        </p>
      </div>
    </div>
  );
}
