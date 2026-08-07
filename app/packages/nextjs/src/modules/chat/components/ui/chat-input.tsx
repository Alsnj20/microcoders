"use client";

import {
  ChatInput as ChatInputBase,
  ChatAttachButton,
  ChatAgentBadge,
  ChatHelperText,
} from "../../../../../components/ui/chat";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, disabled }: ChatInputProps) {
  return (
    <div className="fixed bottom-0 left-0 lg:left-70 right-0 z-30">
      <ChatInputBase
        onSendMessage={onSendMessage}
        disabled={disabled}
        placeholder="Ask MemoryChain agent or request analysis..."
      >
        <ChatAttachButton />
        <ChatAgentBadge agentName="Agent-v1.4" />
      </ChatInputBase>
      <div className="bg-background/95 backdrop-blur-sm px-4 pb-4">
        <ChatHelperText>
          Tus mensajes y memorias están cifrados de extremo a extremo.
        </ChatHelperText>
      </div>
    </div>
  );
}
