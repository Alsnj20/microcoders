"use client";

import {
  ChatBubble,
  ChatContainer,
  ChatEmptyState,
  ChatMessages,
  ChatHelperText,
} from "../../../../../components/ui/chat";
import { SharedBotAvatar } from "../../../../../components/shared/SharedBotAvatar";
import type { Agent, AgentChatMessage } from "../../types/agent";

interface AgentChatProps {
  agent: Agent | null;
  messages: AgentChatMessage[];
  onSendMessage: (content: string) => void;
}

export function AgentChat({ agent, messages, onSendMessage }: AgentChatProps) {
  if (!agent) {
    return (
      <ChatContainer>
        <ChatMessages empty>
          <ChatEmptyState description="Selecciona un agente para ver su perfil." />
        </ChatMessages>
      </ChatContainer>
    );
  }

  return (
    <ChatContainer>
      <ChatMessages empty={false}>
        {/* Agent header */}
        <div className="flex flex-col items-center mb-6 pt-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <span className="text-3xl">{(agent as any).icon || "🤖"}</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">{agent.name}</h2>
          {agent.description && (
            <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">{agent.description}</p>
          )}
        </div>

        {/* Preview message from agent */}
        <div className="flex gap-3 justify-start">
          <SharedBotAvatar size="md" />
          <div className="max-w-[70%] px-4 py-3 rounded-2xl bg-muted text-foreground border border-border rounded-bl-md">
            <p className="text-sm font-medium mb-1">Vista previa del agente</p>
            <p className="text-sm text-muted-foreground">
              Soy <span className="font-medium text-foreground">{agent.name}</span>.
              {agent.description || " Estoy listo para ayudarte con tus consultas."}
              Para chatear conmigo, inicia una conversación desde el chat principal.
            </p>
          </div>
        </div>

        {/* Sample interaction preview */}
        <div className="flex gap-3 justify-end mt-4">
          <div className="max-w-[70%] px-4 py-3 rounded-2xl bg-primary text-primary-foreground rounded-br-md">
            <p className="text-sm">Ejemplo: ¿Qué puedes hacer?</p>
          </div>
          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-sm text-muted-foreground">person</span>
          </div>
        </div>

        <div className="flex gap-3 justify-start mt-4">
          <SharedBotAvatar size="md" />
          <div className="max-w-[70%] px-4 py-3 rounded-2xl bg-muted text-foreground border border-border rounded-bl-md">
            <p className="text-sm">
              Puedo ayudarte con análisis de datos, responder preguntas sobre tus memorias,
              generar contenido y más. ¡Inicia una conversación para probarlo!
            </p>
          </div>
        </div>
      </ChatMessages>

      <div className="border-t border-border/40 bg-background/95 backdrop-blur-sm p-4">
        <div className="flex items-center gap-2 w-full max-w-4xl mx-auto bg-card rounded-3xl border border-border p-2 shadow-md opacity-50 pointer-events-none">
          <input
            type="text"
            placeholder="El chat está en el módulo principal..."
            disabled
            className="flex-1 bg-transparent border-none outline-none font-sans text-base text-muted-foreground placeholder:text-muted-foreground px-2"
          />
          <button
            type="button"
            disabled
            className="p-2.5 bg-primary text-primary-foreground rounded-full opacity-40 cursor-not-allowed shadow-sm flex items-center justify-center shrink-0"
          >
            <span className="material-symbols-outlined text-xl">arrow_upward</span>
          </button>
        </div>
        <ChatHelperText>
          El chat con este agente se realiza desde el módulo <span className="font-medium text-foreground">Chat</span>.
        </ChatHelperText>
      </div>
    </ChatContainer>
  );
}
