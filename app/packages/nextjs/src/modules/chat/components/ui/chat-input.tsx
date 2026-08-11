"use client";

import {
  ChatAgentBadge,
  ChatAttachButton,
  ChatHelperText,
  ChatInput as ChatInputBase,
} from "../../../../../components/ui/chat";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  return (
    <div className="shrink-0 bg-background z-30">
      <ChatInputBase
        onSendMessage={onSendMessage}
        disabled={disabled}
        placeholder="Ask MemoryChain agent or request analysis..."
      >
        <ChatAttachButton />
        <ChatAgentBadge agentName="Agent-v1.4" />
      </ChatInputBase>
      <div className="bg-background/95 backdrop-blur-sm px-4 pb-4">
        <ChatHelperText>Tus mensajes y memorias están cifrados de extremo a extremo.</ChatHelperText>
      </div>
    </div>
  );
}
