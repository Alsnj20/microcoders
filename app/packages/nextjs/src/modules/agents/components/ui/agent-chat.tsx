"use client";

import {
  ChatAttachButton,
  ChatBubble,
  ChatContainer,
  ChatEmptyState,
  ChatHelperText,
  ChatInput,
  ChatInsertMedia,
  ChatMessages,
} from "../../../../../components/ui/chat";
import type { Agent, AgentChatMessage } from "../../types/agent";

interface AgentChatProps {
  agent: Agent | null;
  messages: AgentChatMessage[];
  onSendMessage: (content: string) => void;
}

export function AgentChat({ agent, messages, onSendMessage }: AgentChatProps) {
  return (
    <ChatContainer>
      <ChatMessages empty={messages.length === 0}>
        {messages.length === 0 ? (
          <ChatEmptyState
            description={agent?.description || "Selecciona un agente o inicia una nueva conversación."}
          />
        ) : (
          messages.map(msg => (
            <ChatBubble key={msg.id} role={msg.role} content={msg.content} timestamp={msg.timestamp} />
          ))
        )}
      </ChatMessages>

      <ChatInput onSendMessage={onSendMessage} placeholder="Ask MemoryChain agent or request analysis...">
        <ChatAttachButton />
        <ChatInsertMedia />
      </ChatInput>
      <div className="bg-background/95 backdrop-blur-sm px-4 pb-4">
        <ChatHelperText>Tus mensajes y memorias están cifrados de extremo a extremo.</ChatHelperText>
      </div>
    </ChatContainer>
  );
}
