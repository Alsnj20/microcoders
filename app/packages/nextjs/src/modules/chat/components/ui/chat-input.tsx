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

export function ChatInput({
  onSendMessage,
  selectedModel,
  onModelChange,
  disabled,
}: ChatInputProps) {
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
    if (models.length > 0 && !models.some((m) => m.model === selectedModel)) {
      onModelChange(models[0].model);
    }
  }, [models, selectedModel, onModelChange]);

  const hasProviders = models.length > 0;
  const noProviders = !loading && !hasProviders;
  const interactionDisabled = disabled || !hasProviders;

  return (
    <div className="shrink-0 bg-background z-30">
      <ChatInputBase
        onSendMessage={onSendMessage}
        disabled={interactionDisabled}
        placeholder={
          noProviders
            ? "Sin proveedores disponibles"
            : "Escribe tu mensaje o solicita un análisis..."
        }
      >
        <select
          value={noProviders ? "" : selectedModel}
          onChange={(e) => onModelChange(e.target.value)}
          disabled={interactionDisabled}
          className="px-2 py-1.5 rounded-lg border border-input bg-transparent text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring max-w-[170px]"
        >
          {loading ? (
            <option value="">Cargando proveedores…</option>
          ) : noProviders ? (
            <option value="" disabled>
              Sin proveedores disponibles
            </option>
          ) : (
            models.map((m) => (
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
            No hay proveedores disponibles en este momento. El servicio de IA no está accesible — por favor intenta más tarde.
          </ChatHelperText>
        ) : (
          <ChatHelperText>Tus mensajes y memorias están cifrados de extremo a extremo.</ChatHelperText>
        )}
      </div>
    </div>
  );
}
