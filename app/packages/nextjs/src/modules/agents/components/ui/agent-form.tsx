"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { api } from "~~/services/api/client";
import type { Agent, AgentModel } from "../../types/agent";

const AGENT_ICONS = ["🤖", "🧠", "📈", "💻", "🎯", "🔬", "📚", "✍️", "🎨", "🔧"];
const AVAILABLE_TOOLS = ["SearchTool", "PDFLoader", "VectorStore", "BlockchainReader", "CodeAnalyzer", "WebSearch"];

const agentFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  icon: z.string().default("🤖"),
  model: z.enum(["gpt-5.5", "claude", "gemini", "llama3"]).default("gpt-5.5"),
  personality: z.string().optional(),
  instructions: z.string().optional(),
  tools: z.array(z.string()).default([]),
  persistentMemory: z.boolean().default(true),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

interface AgentFormProps {
  agent?: Agent | null;
  onSubmit: (data: AgentFormData) => void;
  onClose: () => void;
  linkedMemories?: string[];
  onLinkMemory?: (memoryId: string) => void;
  onUnlinkMemory?: (memoryId: string) => void;
}

interface MemoryItem {
  memoryId: string;
  name: string;
  cid: string;
  memoryType: number;
}

export function AgentForm({ agent, onSubmit, onClose, linkedMemories = [], onLinkMemory, onUnlinkMemory }: AgentFormProps) {
  const [selectedTools, setSelectedTools] = useState<string[]>(agent?.tools || []);
  const [showMemorySelector, setShowMemorySelector] = useState(false);
  const [availableMemories, setAvailableMemories] = useState<MemoryItem[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm<AgentFormData>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "🤖",
      model: "gpt-5.5",
      personality: "",
      instructions: "",
      tools: [],
      persistentMemory: true,
    },
  });

  const selectedIcon = watch("icon");

  useEffect(() => {
    if (showMemorySelector) {
      api.memories.$get().then(res => {
        if (res.ok) res.json().then(data => setAvailableMemories(data.memories || []));
      }).catch(() => {});
    }
  }, [showMemorySelector]);

  useEffect(() => {
    if (agent) {
      reset({
        name: agent.name,
        description: agent.description || "",
        icon: agent.icon || "🤖",
        model: agent.model || "gpt-5.5",
        personality: agent.personality || "",
        instructions: (agent as any).instructions || "",
        tools: agent.tools,
        persistentMemory: agent.persistentMemory,
      });
      setSelectedTools(agent.tools);
    }
  }, [agent, reset]);

  const handleFormSubmit = (data: AgentFormData) => {
    const personalityText = [data.personality, data.instructions].filter(Boolean).join(": ");
    onSubmit({ ...data, tools: selectedTools, personality: personalityText });
  };

  const toggleTool = (tool: string) => {
    setSelectedTools(prev => {
      const newTools = prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool];
      setValue("tools", newTools);
      return newTools;
    });
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Information */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Información básica
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              Nombre del agente
            </label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Ej. ResearchAgent"
            />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-foreground mb-1">
              Descripción
            </label>
            <textarea
              id="description"
              {...register("description")}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="¿Qué hace este agente y en qué te ayuda?"
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {(watch("description") || "").length}/200
            </p>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Configuración
        </h3>
        <div className="space-y-3">
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-foreground mb-1">
              Modelo de IA
            </label>
            <select
              id="model"
              {...register("model")}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="gpt-5.5">GPT-4o</option>
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
              <option value="llama3">Llama 3</option>
            </select>
          </div>
          <div>
            <label htmlFor="personality" className="block text-sm font-medium text-foreground mb-1">
              Personalidad <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <select
              id="personality"
              {...register("personality")}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">Seleccionar...</option>
              <option value="profesional">Profesional y analítico</option>
              <option value="amigable">Amigable y cercano</option>
              <option value="tecnico">Técnico y directo</option>
              <option value="creativo">Creativo e innovador</option>
            </select>
          </div>
          <div>
            <label htmlFor="instructions" className="block text-sm font-medium text-foreground mb-1">
              Instrucciones personalizadas <span className="text-muted-foreground font-normal">(opcional)</span>
            </label>
            <textarea
              id="instructions"
              {...register("instructions")}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-input bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              placeholder="Instrucciones específicas para tu agente..."
            />
            <p className="text-xs text-muted-foreground text-right mt-1">
              {(watch("instructions") || "").length}/500
            </p>
          </div>
        </div>
      </div>

      {/* Tools */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Herramientas permitidas
        </h3>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_TOOLS.map(tool => (
            <button
              key={tool}
              type="button"
              onClick={() => toggleTool(tool)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedTools.includes(tool)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border"
              }`}
            >
              {tool}
              {selectedTools.includes(tool) && <span className="ml-1">×</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Memory Connection */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Conectar memorias
        </h3>
        <p className="text-xs text-muted-foreground mb-2">Selecciona las memorias que podrá usar este agente.</p>
        <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => setShowMemorySelector(!showMemorySelector)}>
          <span className="material-symbols-outlined text-sm">add</span>
          Seleccionar memorias ({linkedMemories.length} vinculadas)
        </Button>
        {showMemorySelector && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto border border-border rounded-lg p-2">
            {availableMemories.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No hay memorias creadas</p>
            ) : (
              availableMemories.map(mem => {
                const isLinked = linkedMemories.includes(mem.memoryId);
                return (
                  <button
                    key={mem.memoryId}
                    type="button"
                    onClick={() => {
                      if (isLinked) onUnlinkMemory?.(mem.memoryId);
                      else onLinkMemory?.(mem.memoryId);
                    }}
                    className={`w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs transition-colors ${
                      isLinked ? "bg-primary/10 border border-primary/30" : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {mem.memoryType === 0 ? "description" : mem.memoryType === 1 ? "code" : "science"}
                    </span>
                    <span className="flex-1 truncate">{mem.name}</span>
                    {isLinked && <span className="material-symbols-outlined text-xs text-primary">check</span>}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Privacy */}
      <div className="p-3 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-sm text-muted-foreground">lock</span>
          <span className="text-xs font-medium text-foreground">Privacidad</span>
        </div>
        <p className="text-xs text-muted-foreground">Este agente solo puede acceder a las memorias que tú autorices.</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={isSubmitting}>
          {agent ? "Guardar cambios" : "Crear agente"}
          {!agent && <span className="material-symbols-outlined text-sm ml-1">auto_awesome</span>}
        </Button>
      </div>
    </form>
  );
}
