"use client";

import { useState, useEffect } from "react";
import { Button } from "~~/components/ui/button";
import { SlideOver } from "~~/components/ui/slide-over";
import { LateralBar, LateralBarContent, LateralBarSection, LateralBarSectionButton, LateralBarFooter } from "~~/components/ui/lateral-bar";
import { SlidePanel } from "~~/components/shared/SlidePanel";
import { AgentForm } from "~~/src/modules/agents/components/ui/agent-form";
import { AgentMemoryLinker } from "~~/src/modules/agents/components/ui/agent-memory-linker";
import { useAgent } from "~~/src/modules/agents/hooks/use-agent";
import { resolveMemoryTitleSafe } from "~~/src/modules/memories/services/memory-title";
import { useGlobalState } from "~~/services/store/store";
import { api } from "~~/services/api/client";
import type { Agent } from "~~/src/modules/agents/types/agent";

export default function AgentsPage() {
  const { session } = useGlobalState();
  const {
    agents,
    selectedAgent,
    selectedAgentId,
    setSelectedAgentId,
    loading,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgent,
    linkMemory,
    unlinkMemory,
  } = useAgent();

  const [showPanel, setShowPanel] = useState<"create" | "edit" | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showMemoryLinker, setShowMemoryLinker] = useState(false);
  const [linkedMemories, setLinkedMemories] = useState<{ memoryId: string; title: string; cid: string }[]>([]);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  // Hydrate selected agent's full blueprint (personality, instructions, description)
  useEffect(() => {
    if (selectedAgent && !selectedAgent.personality && !selectedAgent.instructions) {
      getAgent(selectedAgent.id).catch(() => {});
    }
  }, [selectedAgent, getAgent]);

  useEffect(() => {
    if (selectedAgentId) {
      loadLinkedMemories(selectedAgentId);
    }
  }, [selectedAgentId]);

  const loadLinkedMemories = async (agentId: string) => {
    try {
      const res = await api.context.agent[agentId].memories.$get();
      if (res.ok) {
        const data = await res.json();
        const links = data.links || [];
        const memories: { memoryId: string; title: string; cid: string }[] = [];
        for (const link of links) {
          const memRes = await api.memories[":id"].$get({ param: { id: link.memoryId } });
          if (memRes.ok) {
            const memData = await memRes.json();
            const title = await resolveMemoryTitleSafe(memData.cid, session.kWallet, memData.name || link.memoryId);
            memories.push({ memoryId: link.memoryId, title, cid: memData.cid });
          }
        }
        setLinkedMemories(memories);
      }
    } catch (err) {
      console.error("Failed to load linked memories:", err);
    }
  };
  const handleCreate = () => {
    setEditingAgent(null);
    setShowPanel("create");
  };

  const handleEdit = async () => {
    if (!selectedAgent) return;
    try {
      const fullAgent = await getAgent(selectedAgent.id);
      setEditingAgent(fullAgent || selectedAgent);
      setShowPanel("edit");
    } catch {
      setEditingAgent(selectedAgent);
      setShowPanel("edit");
    }
  };

  const handleDelete = async () => {
    if (!selectedAgent || !confirm("¿Archivar este agente?")) return;
    await deleteAgent(selectedAgent.id);
  };

  const handleFormSubmit = async (data: { name: string; icon: string; persistentMemory: boolean; description?: string; personality?: string; instructions?: string; model?: string; tools?: string[] }) => {
    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id, data);
      } else {
        await createAgent({ ...data, connectedMemories: [], isArchived: false });
      }
      setShowPanel(null);
      setEditingAgent(null);
    } catch (err: any) {
      console.error("Form error:", err);
      alert(`Error al guardar el agente: ${err.message || "Inténtalo de nuevo"}`);
    }
  };

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id);
    setShowLeftPanel(false);
  };

  const sidebarContent = (
    <>
      <div className="px-4 py-2">
        <button
          type="button"
          onClick={handleCreate}
          className="w-full bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo Agente
        </button>
      </div>

      <LateralBarContent>
        <LateralBarSection title="MIS AGENTES">
          {agents.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 px-4">
              No hay agentes creados aún.
            </p>
          ) : (
            agents.map(agent => (
              <LateralBarSectionButton
                key={agent.id}
                onClick={() => handleSelectAgent(agent.id)}
                isActive={selectedAgentId === agent.id}
                icon="smart_toy"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{agent.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{agent.description || "Sin descripción"}</p>
                </div>
              </LateralBarSectionButton>
            ))
          )}
        </LateralBarSection>
      </LateralBarContent>

      <LateralBarFooter>
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
          <span className="text-3xl mb-2 block">🤖</span>
          <p className="text-xs font-semibold text-foreground">Tus agentes.</p>
          <p className="text-xs font-semibold text-foreground">Tu propiedad.</p>
          <p className="text-xs font-semibold text-foreground">Tu control.</p>
        </div>
      </LateralBarFooter>
    </>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background shrink-0">
        <button
          type="button"
          onClick={() => setShowLeftPanel(true)}
          className="p-2 px-8 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
        >
          <span className="text-md font-medium text-foreground">AGENTES</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm font-medium text-foreground truncate max-w-45">
            {selectedAgent?.name || "MemoryChain"}
          </span>
        </div>

        {selectedAgent && (
          <button
            type="button"
            onClick={() => setShowRightPanel(true)}
            className="p-2 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
          >
            <span className="text-md font-medium text-foreground">DETALLES</span>
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - desktop */}
        <div className="hidden lg:flex">
          <LateralBar width="md" forceVisible>
            {sidebarContent}
          </LateralBar>
        </div>

        {/* Left Sidebar - mobile slide-over */}
        <SlideOver open={showLeftPanel} onClose={() => setShowLeftPanel(false)} side="left" title="Agentes" width="w-80">
          <LateralBar width="lg" forceVisible className="border-r-0">
            {sidebarContent}
          </LateralBar>
        </SlideOver>

        {/* Center — Chat */}
        <main className="flex-1 flex flex-col bg-background overflow-hidden">
          {!selectedAgent ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <span className="material-symbols-outlined text-5xl mb-3 block">smart_toy</span>
                <p className="text-lg font-medium">Selecciona un agente</p>
                <p className="text-sm mt-1">O crea uno nuevo para empezar a chatear.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header - desktop only */}
              <div className="hidden lg:flex items-center gap-3 px-6 py-3 border-b border-border bg-card">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg">{selectedAgent.icon || "🤖"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{selectedAgent.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedAgent.description || "Sin descripción"}</p>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">Activo</span>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-3xl mx-auto space-y-4">
                  {/* Agent header */}
                  <div className="flex flex-col items-center mb-6 pt-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
                      <span className="text-3xl">{selectedAgent.icon || "🤖"}</span>
                    </div>
                    <h2 className="text-xl font-semibold text-foreground">{selectedAgent.name}</h2>
                    {selectedAgent.description && (
                      <p className="text-sm text-muted-foreground mt-1 text-center max-w-md">{selectedAgent.description}</p>
                    )}
                  </div>

                  {/* Preview message from agent */}
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-border flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-sm text-primary">smart_toy</span>
                    </div>
                    <div className="max-w-[70%] px-4 py-3 rounded-2xl bg-muted text-foreground border border-border rounded-bl-md">
                      <p className="text-sm font-medium mb-1">Vista previa del agente</p>
                      <p className="text-sm text-muted-foreground">
                        Soy <span className="font-medium text-foreground">{selectedAgent.name}</span>.
                        {selectedAgent.description || " Estoy listo para ayudarte con tus consultas."}
                        Para chatear conmigo, inicia una conversación desde el chat principal.
                      </p>
                    </div>
                  </div>

                  {/* Sample interaction preview */}
                  <div className="flex gap-3 justify-end mt-4">
                    <div className="max-w-[70%] px-4 py-3 rounded-2xl bg-primary text-primary-foreground rounded-br-md">
                      <p className="text-sm">Ejemplo: ¿Qué puedes hacer?</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-sm text-muted-foreground">person</span>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-start mt-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 border border-border flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-sm text-primary">smart_toy</span>
                    </div>
                    <div className="max-w-[70%] px-4 py-3 rounded-2xl bg-muted text-foreground border border-border rounded-bl-md">
                      <p className="text-sm">
                        Puedo ayudarte con análisis de datos, responder preguntas sobre tus memorias,
                        generar contenido y más. ¡Inicia una conversación para probarlo!
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disabled Input */}
              <div className="border-t border-border bg-background p-4 shrink-0">
                <div className="flex items-center gap-2 max-w-3xl mx-auto bg-card rounded-2xl border border-border p-2 shadow-sm opacity-50 pointer-events-none">
                  <input
                    type="text"
                    placeholder="El chat está en el módulo principal..."
                    disabled
                    className="flex-1 bg-transparent border-none outline-none text-sm text-muted-foreground placeholder:text-muted-foreground px-2"
                  />
                  <button
                    type="button"
                    disabled
                    className="p-2.5 bg-primary text-primary-foreground rounded-full opacity-40 cursor-not-allowed transition-all"
                  >
                    <span className="material-symbols-outlined text-xl">arrow_upward</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  El chat con este agente se realiza desde el módulo <span className="font-medium text-foreground">Chat</span>.
                </p>
              </div>
            </>
          )}
        </main>

        {/* Right Panel - desktop */}
        {selectedAgent && (
          <aside className="hidden xl:flex w-80 flex-col h-full border-l border-border bg-background overflow-hidden">
            <AgentDetailsPanel
              agent={selectedAgent}
              linkedMemories={linkedMemories}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onLinkMemory={() => setShowMemoryLinker(true)}
              onUnlinkMemory={async (memoryId) => {
                await unlinkMemory(selectedAgent.id, memoryId);
                loadLinkedMemories(selectedAgent.id);
              }}
            />
          </aside>
        )}

        {/* Right Panel - mobile slide-over */}
        <SlideOver open={showRightPanel} onClose={() => setShowRightPanel(false)} side="right" title="Detalles" width="w-80">
          {selectedAgent && (
            <AgentDetailsPanel
              agent={selectedAgent}
              linkedMemories={linkedMemories}
              onEdit={() => { setShowRightPanel(false); handleEdit(); }}
              onDelete={handleDelete}
              onLinkMemory={() => { setShowRightPanel(false); setShowMemoryLinker(true); }}
              onUnlinkMemory={async (memoryId) => {
                await unlinkMemory(selectedAgent.id, memoryId);
                loadLinkedMemories(selectedAgent.id);
              }}
            />
          )}
        </SlideOver>
      </div>

      {/* Right Slide Panel — Create / Edit Form */}
      <SlidePanel
        title={showPanel === "create" ? "Crear nuevo agente" : "Editar agente"}
        open={showPanel !== null}
        onClose={() => { setShowPanel(null); setEditingAgent(null); }}
      >
        <AgentForm
          agent={editingAgent}
          onSubmit={handleFormSubmit}
          onClose={() => { setShowPanel(null); setEditingAgent(null); }}
          linkedMemories={editingAgent?.connectedMemories || []}
          onLinkMemory={(memoryId) => editingAgent && linkMemory(editingAgent.id, memoryId)}
          onUnlinkMemory={(memoryId) => editingAgent && unlinkMemory(editingAgent.id, memoryId)}
        />
      </SlidePanel>

      {/* Memory Linker Modal */}
      {showMemoryLinker && selectedAgent && (
        <AgentMemoryLinker
          agentId={selectedAgent.id}
          onLink={async (agentId, memoryId) => {
            await linkMemory(agentId, memoryId);
            loadLinkedMemories(agentId);
          }}
          onUnlink={async (agentId, memoryId) => {
            await unlinkMemory(agentId, memoryId);
            loadLinkedMemories(agentId);
          }}
          onClose={() => setShowMemoryLinker(false)}
        />
      )}
    </div>
  );
}

function AgentDetailsPanel({
  agent,
  linkedMemories,
  onEdit,
  onDelete,
  onLinkMemory,
  onUnlinkMemory,
}: {
  agent: Agent;
  linkedMemories: { memoryId: string; title: string; cid: string }[];
  onEdit: () => void;
  onDelete: () => void;
  onLinkMemory: () => void;
  onUnlinkMemory: (memoryId: string) => void;
}) {
  return (
    <>
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detalles</h3>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" onClick={onEdit} title="Editar">
              <span className="material-symbols-outlined text-lg">edit</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} title="Archivar">
              <span className="material-symbols-outlined text-lg">delete</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-3xl">{"🤖"}</span>
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{agent.name}</p>
            {agent.model && <p className="text-xs text-muted-foreground">{agent.model}</p>}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Descripción</h4>
          <p className="text-sm text-foreground">{agent.description || "Sin descripción"}</p>
        </div>

        {agent.personality && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Personalidad</h4>
            <p className="text-sm text-foreground bg-muted/60 p-2.5 rounded-lg border border-border/50 whitespace-pre-wrap">{agent.personality}</p>
          </div>
        )}

        {agent.instructions && (
          <div>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Instrucciones personalizadas</h4>
            <p className="text-sm text-foreground bg-muted/60 p-2.5 rounded-lg border border-border/50 whitespace-pre-wrap">{agent.instructions}</p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Memorias</h4>
            <Button variant="ghost" size="sm" onClick={onLinkMemory}>
              <span className="material-symbols-outlined text-sm">add</span>
              Vincular
            </Button>
          </div>
          {linkedMemories.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">No hay memorias vinculadas.</p>
          ) : (
            <div className="space-y-2">
              {linkedMemories.map((mem) => (
                <div key={mem.memoryId} className="flex items-center justify-between p-2.5 rounded-lg bg-muted border border-border">
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-sm font-medium text-foreground truncate">{mem.title}</p>
                    {/*<p className="text-xs text-muted-foreground truncate">{mem.cid}</p>*/}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => onUnlinkMemory(mem.memoryId)}
                    title="Desvincular"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-border">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Creado</p>
              <p className="text-xs text-foreground">{agent.createdAt}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Actualizado</p>
              <p className="text-xs text-foreground">{agent.updatedAt}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
