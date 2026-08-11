"use client";

import { useEffect, useState } from "react";
import { api } from "~~/services/api/client";
import {
  ChatHelperText,
  ChatInput as ChatInputBase,
} from "../../../../../components/ui/chat";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.credits["ai-fees"]
      .$get()
      .then((res: any) => {
        if (!res.ok) return { fees: [] };
        return res.json();
      })
      .then((data: any) => setModels(data.fees || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (models.length > 0 && !models.some(m => m.model === selectedModel)) {
      onModelChange(models[0].model);
    }
  }, [models, selectedModel, onModelChange]);

  const hasProviders = models.length > 0;
  const noProviders = !loading && !hasProviders;
  const interactionDisabled = disabled || !hasProviders;

  return (
    <div className="fixed bottom-0 left-0 lg:left-70 right-0 z-30">
      <ChatInputBase
        onSendMessage={onSendMessage}
        disabled={interactionDisabled}
        placeholder={noProviders ? "No providers available" : "Ask MemoryChain agent or request analysis..."}
      >
        <select
          value={noProviders ? "" : selectedModel}
          onChange={e => onModelChange(e.target.value)}
          disabled={interactionDisabled}
          className="px-2 py-1.5 rounded-lg border border-input bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring max-w-[160px]"
        >
          {loading ? (
            <option value="">Loading providers…</option>
          ) : noProviders ? (
            <option value="" disabled>
              No providers available
            </option>
          ) : (
            models.map(m => (
              <option key={m.model} value={m.model}>
                {m.label} ({m.costInMC} MC)
              </option>
            ))
          )}
        </select>
      </ChatInputBase>
      <div className="bg-background/95 backdrop-blur-sm px-4 pb-4">
        {noProviders ? (
          <ChatHelperText>
            No providers available. The AI service isn&apos;t reachable — please try again later.
          </ChatHelperText>
        ) : (
          <ChatHelperText>Tus mensajes y memorias están cifrados de extremo a extremo.</ChatHelperText>
        )}
      </div>
    </div>
  );
}
