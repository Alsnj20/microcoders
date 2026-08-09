"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAgent } from "../../hooks/use-agent";
import type { Agent, AgentModel } from "../../types/agent";
import { AgentChat } from "../ui/agent-chat";
import { AgentForm } from "../ui/agent-form";
import { AgentInfoPanel } from "../ui/agent-info-panel";
import { AgentMemoryLinker } from "../ui/agent-memory-linker";

export function AgentsPage() {
  const router = useRouter();
  const {
    agents,
    selectedAgent,
    selectedAgentId,
    setSelectedAgentId,
    selectedConversationId,
    setSelectedConversationId,
    agentConversations,
    currentMessages,
    loading,
    isGenerating,
    getAgent,
    createAgent,
    updateAgent,
    deleteAgent,
    createConversation,
    sendMessage,
    linkMemory,
    unlinkMemory,
    fetchLinkedMemories,
  } = useAgent();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showMemoryLinker, setShowMemoryLinker] = useState(false);

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setIsFormOpen(true);
  };

  const handleEditAgent = async (agent: Agent) => {
    try {
      const fullAgent = await getAgent(agent.id);
      setEditingAgent(fullAgent);
      setIsFormOpen(true);
    } catch {
      alert("Error al descifrar el blueprint del agente.");
    }
  };

  const handleFormSubmit = async (data: {
    name: string;
    description?: string;
    icon: string;
    model: AgentModel;
    personality?: string;
    tools: string[];
    persistentMemory: boolean;
  }) => {
    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id, data);
      } else {
        await createAgent({ ...data, connectedMemories: [] });
      }
      setIsFormOpen(false);
      setEditingAgent(null);
    } catch {
      // Error is surfaced by the hook
    }
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar este agente?")) return;
    try {
      await deleteAgent(id);
    } catch {
      alert("Error al eliminar el agente.");
    }
  };

  const handleCreateConversation = () => {
    if (selectedAgentId) {
      createConversation(selectedAgentId);
      router.push("/chat");
    }
  };

  const handleSendMessage = (content: string) => {
    if (selectedConversationId) sendMessage(selectedConversationId, content);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Panel — Agent Gallery */}
      <div className="w-80 border-r border-border bg-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Agentes</h2>
            <button
              onClick={handleCreateAgent}
              className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-lg">add</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {agents.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2">smart_toy</span>
              <p className="text-sm text-muted-foreground">No hay agentes creados</p>
              <button
                onClick={handleCreateAgent}
                className="mt-3 text-sm text-primary hover:text-primary/80 font-medium"
              >
                Crear primer agente
              </button>
            </div>
          ) : (
            agents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgentId(agent.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  selectedAgentId === agent.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-lg">{(agent as any).icon || "🤖"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{agent.description || "Sin descripción"}</p>
                  </div>
                </div>
                {selectedAgentId === agent.id && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditAgent(agent);
                      }}
                      className="flex-1 py-1.5 rounded-lg bg-background border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                    >
                      Editar
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAgent(agent.id);
                      }}
                      className="py-1.5 px-3 rounded-lg bg-background border border-border text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Center — Chat or Agent Details */}
      <div className="flex-1 flex flex-col">
        {selectedAgent ? (
          <AgentChat agent={selectedAgent} messages={currentMessages} onSendMessage={handleSendMessage} disabled={isGenerating} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl mb-3">smart_toy</span>
              <p className="text-lg font-medium">Selecciona un agente</p>
              <p className="text-sm mt-1">O crea uno nuevo para empezar</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel — Agent Info */}
      {selectedAgent && (
        <AgentInfoPanel
          agent={selectedAgent}
          onEdit={handleEditAgent}
          onLinkMemory={() => setShowMemoryLinker(true)}
          onStartChat={handleCreateConversation}
        />
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <AgentForm
          agent={editingAgent}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsFormOpen(false);
            setEditingAgent(null);
          }}
        />
      )}

      {/* Memory Linker Modal */}
      {showMemoryLinker && selectedAgentId && (
        <AgentMemoryLinker
          agentId={selectedAgentId}
          onLink={linkMemory}
          onUnlink={unlinkMemory}
          onClose={() => setShowMemoryLinker(false)}
        />
      )}

      {/* Floating Create Button (Mobile) */}
      <button
        type="button"
        onClick={handleCreateAgent}
        disabled={loading}
        className="fixed bottom-20 right-6 lg:hidden w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-all z-40 disabled:opacity-50"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>
    </div>
  );
}
