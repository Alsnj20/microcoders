"use client";

import { useEffect, useState } from "react";
import {
  ChatAgentBadge,
  ChatAttachButton,
  ChatHelperText,
  ChatInput as ChatInputBase,
} from "../../../../../components/ui/chat";
import { api } from "~~/services/api/client";

interface AiFee {
  provider: string;
  model: string;
  costInMC: number;
  label: string;
}

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSendMessage, selectedModel, onModelChange, disabled }: ChatInputProps) {
  const [models, setModels] = useState<AiFee[]>([]);

  useEffect(() => {
    api.credits["ai-fees"].$get()
      .then(res => {
        if (res.ok) res.json().then(data => setModels(data.fees || []));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="fixed bottom-0 left-0 lg:left-70 right-0 z-30">
      <ChatInputBase
        onSendMessage={onSendMessage}
        disabled={disabled}
        placeholder="Ask MemoryChain agent or request analysis..."
      >
        <select
          value={selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={disabled}
          className="px-2 py-1.5 rounded-lg border border-input bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring max-w-[160px]"
        >
          {models.length === 0 ? (
            <option value="gpt-4o-mini">GPT-4o Mini</option>
          ) : (
            models.map((m) => (
              <option key={m.model} value={m.model}>
                {m.label} ({m.costInMC} MC)
              </option>
            ))
          )}
        </select>
        <ChatAttachButton />
        <ChatAgentBadge agentName="Agent-v1.4" />
      </ChatInputBase>
      <div className="bg-background/95 backdrop-blur-sm px-4 pb-4">
        <ChatHelperText>Tus mensajes y memorias están cifrados de extremo a extremo.</ChatHelperText>
      </div>
    </div>
  );
}
