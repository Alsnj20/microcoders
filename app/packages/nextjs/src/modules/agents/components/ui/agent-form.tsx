"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Agent, AgentModel } from "../../types/agent";

const AGENT_ICONS = ["🤖", "🧠", "📈", "💻", "🎯", "🔬", "📚", "✍️", "🎨", "🔧"];
const AVAILABLE_TOOLS = ["SearchTool", "PDFLoader", "VectorStore", "BlockchainReader", "CodeAnalyzer", "WebSearch"];

const agentFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  description: z.string().optional(),
  icon: z.string().default("🤖"),
  model: z.enum(["gpt-5.5", "claude", "gemini", "llama3"]).default("gpt-5.5"),
  personality: z.string().optional(),
  tools: z.array(z.string()).default([]),
  persistentMemory: z.boolean().default(true),
});

type AgentFormData = z.infer<typeof agentFormSchema>;

interface AgentFormProps {
  agent?: Agent | null;
  onSubmit: (data: AgentFormData) => void;
  onClose: () => void;
}

export function AgentForm({ agent, onSubmit, onClose }: AgentFormProps) {
  const [selectedTools, setSelectedTools] = useState<string[]>(agent?.tools || []);

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
      tools: [],
      persistentMemory: true,
    },
  });

  const selectedIcon = watch("icon");

  useEffect(() => {
    if (agent) {
      reset({
        name: agent.name,
        description: agent.description || "",
        icon: agent.icon,
        model: agent.model,
        personality: agent.personality || "",
        tools: agent.tools,
        persistentMemory: agent.persistentMemory,
      });
      setSelectedTools(agent.tools);
    }
  }, [agent, reset]);

  const handleFormSubmit = (data: AgentFormData) => {
    onSubmit({ ...data, tools: selectedTools });
    reset();
    onClose();
  };

  const toggleTool = (tool: string) => {
    setSelectedTools(prev => {
      const newTools = prev.includes(tool) ? prev.filter(t => t !== tool) : [...prev, tool];
      setValue("tools", newTools);
      return newTools;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-card rounded-2xl border border-border/60 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-border/40 bg-card z-10">
          <h2 className="text-lg font-bold text-foreground">{agent ? "Editar Agente" : "Crear Nuevo Agente"}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
            <span className="material-symbols-outlined text-lg text-muted-foreground">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-6">
          {/* Icon + Name */}
          <div className="flex items-start gap-4">
            <div>
              <label id="icon-label" className="block text-sm font-medium text-foreground mb-2">
                Icono
              </label>
              <div className="grid grid-cols-5 gap-2" role="group" aria-labelledby="icon-label">
                {AGENT_ICONS.map(icon => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setValue("icon", icon)}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                      selectedIcon === icon
                        ? "bg-primary/20 border-2 border-primary"
                        : "bg-muted/50 border border-border/40 hover:bg-muted"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                Nombre del Agente *
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                placeholder="Nombre..."
              />
              {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          {/* Description + Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                Descripción
              </label>
              <textarea
                id="description"
                {...register("description")}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
                placeholder="Descripción breve del agente..."
              />
            </div>
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-foreground mb-2">
                Modelo
              </label>
              <select
                id="model"
                {...register("model")}
                className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="gpt-5.5">GPT-5.5</option>
                <option value="claude">Claude</option>
                <option value="gemini">Gemini</option>
                <option value="llama3">Llama 3</option>
              </select>
            </div>
          </div>

          {/* Personality */}
          <div>
            <label htmlFor="personality" className="block text-sm font-medium text-foreground mb-2">
              Personalidad / Instrucciones
            </label>
            <textarea
              id="personality"
              {...register("personality")}
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-border/60 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all resize-none"
              placeholder="Describe el comportamiento y directrices del agente..."
            />
          </div>

          {/* Tools */}
          <div>
            <label id="tools-label" className="block text-sm font-medium text-foreground mb-2">
              Herramientas Permitidas
            </label>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="tools-label">
              {AVAILABLE_TOOLS.map(tool => (
                <button
                  key={tool}
                  type="button"
                  onClick={() => toggleTool(tool)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedTools.includes(tool)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border/40"
                  }`}
                >
                  {tool}
                  {selectedTools.includes(tool) && <span className="ml-1.5">×</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Persistent Memory */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/40">
            <div>
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                Memoria Persistente
                <span className="material-symbols-outlined text-sm text-muted-foreground">info</span>
              </h4>
              <p className="text-xs text-muted-foreground">Recordar contexto entre sesiones</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" {...register("persistentMemory")} className="sr-only peer" />
              <div className="w-10 h-6 bg-muted rounded-full peer peer-checked:bg-primary peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all shadow-inner" />
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border/60 bg-background text-foreground text-sm font-medium hover:bg-muted/50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
            >
              {agent ? "Guardar cambios" : "Crear agente"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
