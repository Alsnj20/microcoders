"use client";

import { Button } from "~~/components/ui/button";
import type { Agent } from "../../types/agent";

interface AgentInfoPanelProps {
  agent: Agent | null;
  onEdit: (agent: Agent) => void;
  onLinkMemory?: () => void;
  onStartChat?: () => void;
}

export function AgentInfoPanel({ agent, onEdit, onLinkMemory, onStartChat }: AgentInfoPanelProps) {
  if (!agent) {
    return (
      <aside className="hidden xl:block w-80 min-h-[calc(100vh-4rem)] border-l border-border/40 bg-background p-6">
        <div className="flex flex-col items-center justify-center h-full text-center">
          <span className="text-6xl mb-4">🤖</span>
          <p className="text-muted-foreground">Selecciona un agente para ver su información</p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="hidden xl:block w-80 min-h-[calc(100vh-4rem)] border-l border-border/40 bg-background overflow-auto">
      {/* Header */}
      <div className="p-6 border-b border-border/40">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground tracking-wider">CONEXIONES</h3>
          <Button variant="ghost" size="icon" onClick={() => onEdit(agent)}>
            <span className="material-symbols-outlined text-lg">edit</span>
          </Button>
        </div>
      </div>

      {/* Agent Info */}
      <div className="p-6 space-y-6">
        {/* Agent Header */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-4xl">{agent.icon}</span>
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg">{agent.name}</h2>
          </div>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground tracking-wider mb-2">DESCRIPCIÓN</h4>
          <p className="text-sm text-foreground">{agent.description || "Sin descripción"}</p>
        </div>

        {/* Personality */}
        {agent.personality && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground tracking-wider mb-2">PERSONALIDAD</h4>
            <p className="text-sm text-foreground leading-relaxed">{agent.personality}</p>
          </div>
        )}

        {/* Connected Memories */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground tracking-wider mb-2">MEMORIAS CONECTADAS</h4>
          <p className="text-sm text-foreground">
            {agent.connectedMemories.length} memoria{agent.connectedMemories.length !== 1 ? "s" : ""} conectada
            {agent.connectedMemories.length !== 1 ? "s" : ""}
          </p>
          {onLinkMemory && (
            <Button variant="outline" size="sm" className="mt-2" onClick={onLinkMemory}>
              <span className="material-symbols-outlined text-sm">link</span>
              Vincular memoria
            </Button>
          )}
        </div>

        {/* Start Chat Button */}
        {onStartChat && (
          <Button className="w-full" onClick={onStartChat}>
            <span className="material-symbols-outlined text-sm">chat</span>
            Iniciar Chat
          </Button>
        )}

        {/* Stats */}
        <div className="pt-4 border-t border-border/40">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Creado</p>
              <p className="text-sm text-foreground">{agent.createdAt}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Actualizado</p>
              <p className="text-sm text-foreground">{agent.updatedAt}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
