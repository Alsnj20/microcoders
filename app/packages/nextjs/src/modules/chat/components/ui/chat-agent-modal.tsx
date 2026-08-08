"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "~~/components/ui/dialog";
import { Button } from "~~/components/ui/button";
import type { AgentBlueprint } from "../../types/chat";

interface AgentSelectorModalProps {
  agents: AgentBlueprint[];
  activeAgentId: string;
  onSelect: (agentId: string) => void;
  onClose: () => void;
  onCreateNew: () => void;
}

export function AgentSelectorModal({
  agents,
  activeAgentId,
  onSelect,
  onClose,
  onCreateNew,
}: AgentSelectorModalProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Seleccionar Agente</DialogTitle>
          <DialogDescription>Elige el agente para esta conversación.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {agents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No hay agentes creados. Crea uno para empezar.
            </p>
          ) : (
            agents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => {
                  onSelect(agent.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                  activeAgentId === agent.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-lg">{agent.icon || "🤖"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                    {activeAgentId === agent.id && (
                      <span className="material-symbols-outlined text-sm text-primary">check_circle</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{agent.description || "Sin descripción"}</p>
                </div>
              </button>
            ))
          )}
        </div>

        <Button variant="outline" className="w-full" onClick={onCreateNew}>
          <span className="material-symbols-outlined text-sm">add</span>
          Crear nuevo agente
        </Button>
      </DialogContent>
    </Dialog>
  );
}
