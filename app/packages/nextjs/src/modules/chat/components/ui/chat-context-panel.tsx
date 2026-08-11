"use client";

import { Button } from "~~/components/ui/button";
import type { AgentBlueprint } from "../../types/chat";

interface ChatContextPanelProps {
  activeAgent: AgentBlueprint | undefined;
  linkedMemories: { memoryId: string; title: string; cid: string }[];
  onSelectAgent: () => void;
  onAddMemory: () => void;
}

export function ChatContextPanel({ activeAgent, linkedMemories, onSelectAgent, onAddMemory }: ChatContextPanelProps) {
  return (
    <aside className="flex w-72 flex-col h-full border-l border-border bg-background overflow-hidden">
      {/* Contexto Activo */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contexto Activo</h3>
          <Button variant="ghost" size="sm" onClick={onSelectAgent}>
            Gestionar
          </Button>
        </div>
        {activeAgent ? (
          <div className="p-3 rounded-lg bg-muted border border-border">
            <p className="text-sm font-medium text-foreground truncate">{activeAgent.name}</p>
            <p className="text-xs text-muted-foreground truncate">{activeAgent.description || "Sin descripción"}</p>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={onSelectAgent}>
            Seleccionar agente
            </Button>

        )}
      </div>

      {/* Memorias Cargadas */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Memorias Cargadas</h3>
          <Button variant="ghost" size="sm" onClick={onAddMemory}>
            <span className="material-symbols-outlined text-sm">add</span>
            Agregar
          </Button>
        </div>
        {linkedMemories.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No hay memorias vinculadas a este agente.</p>
        ) : (
          <div className="space-y-2">
            {linkedMemories.map(mem => (
              <div key={mem.memoryId} className="p-2.5 rounded-lg bg-muted border border-border">
                <p className="text-sm font-medium text-foreground truncate">{mem.title}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{mem.cid}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
