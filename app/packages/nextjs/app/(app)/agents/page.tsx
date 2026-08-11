"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "~~/components/ui/button";
import { SlideOver } from "~~/components/ui/slide-over";
import { LateralBar, LateralBarContent, LateralBarSection, LateralBarSectionButton, LateralBarFooter } from "~~/components/ui/lateral-bar";
import { SlidePanel } from "~~/components/shared/SlidePanel";
import { AgentForm } from "~~/src/modules/agents/components/ui/agent-form";
import { AgentMemoryLinker } from "~~/src/modules/agents/components/ui/agent-memory-linker";
import { useAgent } from "~~/src/modules/agents/hooks/use-agent";
import { api } from "~~/services/api/client";
import type { Agent, AgentModel } from "~~/src/modules/agents/types/agent";

interface AgentChatMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export default function AgentsPage() {
  const {
    agents,
    selectedAgent,
    selectedAgentId,
    setSelectedAgentId,
    loading,
    createAgent,
    updateAgent,
    deleteAgent,
    linkMemory,
    unlinkMemory,
  } = useAgent();

  const [showPanel, setShowPanel] = useState<"create" | "edit" | null>(null);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [showMemoryLinker, setShowMemoryLinker] = useState(false);
  const [chatMessages, setChatMessages] = useState<AgentChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [linkedMemories, setLinkedMemories] = useState<{ memoryId: string; title: string; cid: string }[]>([]);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

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
            memories.push({ memoryId: link.memoryId, title: memData.name || link.memoryId, cid: memData.cid });
          }
        }
        setLinkedMemories(memories);
      }
    } catch (err) {
      console.error("Failed to load linked memories:", err);
    }
  };
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleCreate = () => {
    setEditingAgent(null);
    setShowPanel("create");
  };

  const handleEdit = () => {
    if (selectedAgent) {
      setEditingAgent(selectedAgent);
      setShowPanel("edit");
    }
  };

  const handleDelete = async () => {
    if (!selectedAgent || !confirm("¿Archivar este agente?")) return;
    await deleteAgent(selectedAgent.id);
  };

  const handleFormSubmit = async (data: { name: string; icon: string; model: AgentModel; tools: string[]; persistentMemory: boolean; description?: string; personality?: string; connectedMemories?: string[] }) => {
    try {
      if (editingAgent) {
        await updateAgent(editingAgent.id, data);
      } else {
        await createAgent({ ...data, connectedMemories: [] });
      }
      setShowPanel(null);
      setEditingAgent(null);
    } catch (err) {
      console.error("Form error:", err);
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !selectedAgent) return;

    const userMsg: AgentChatMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      content: chatInput,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const botMsg: AgentChatMsg = {
      id: `a-${Date.now()}`,
      role: "assistant",
      content: `[${selectedAgent.name}] Procesando: "${chatInput}". Consultando memorias vinculadas...`,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages(prev => [...prev, userMsg, botMsg]);
    setChatInput("");
  };

  const handleSelectAgent = (id: string) => {
    setSelectedAgentId(id);
    setChatMessages([]);
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
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <span className="material-symbols-outlined text-4xl mb-2 block">chat</span>
                      <p className="text-sm">Envía un mensaje para iniciar la conversación.</p>
                    </div>
                  ) : (
                    chatMessages.map(msg => (
                      <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-muted text-foreground border border-border rounded-bl-md"
                        }`}>
                          <p className="text-sm whitespace-pre-wrap break-words overflow-hidden">{msg.content}</p>
                          <p className={`text-xs mt-1 ${msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {msg.timestamp}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
              </div>

              {/* Chat Input */}
              <div className="border-t border-border bg-background p-4 shrink-0">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center gap-2 max-w-3xl mx-auto bg-card rounded-2xl border border-border p-2 shadow-sm"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Escribe tu mensaje..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground px-2"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="p-2.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <span className="material-symbols-outlined text-xl">arrow_upward</span>
                  </button>
                </form>
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
}: {
  agent: Agent;
  linkedMemories: { memoryId: string; title: string; cid: string }[];
  onEdit: () => void;
  onDelete: () => void;
  onLinkMemory: () => void;
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
            <span className="text-3xl">{agent.icon || "🤖"}</span>
          </div>
          <div>
            <p className="text-base font-bold text-foreground">{agent.name}</p>
            <p className="text-xs text-muted-foreground">{agent.model}</p>
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
            <p className="text-sm text-foreground">{agent.personality}</p>
          </div>
        )}

        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Herramientas</h4>
          <div className="flex flex-wrap gap-1.5">
            {agent.tools.length > 0 ? agent.tools.map(tool => (
              <span key={tool} className="px-2 py-1 rounded-full bg-muted border border-border text-xs text-foreground">
                {tool}
              </span>
            )) : (
              <p className="text-xs text-muted-foreground">Sin herramientas</p>
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Memorias</h4>
            <Button variant="ghost" size="sm" onClick={onLinkMemory}>
              <span className="material-symbols-outlined text-sm">add</span>
              Vincular
            </Button>
          </div>
          <p className="text-sm text-foreground">
            {agent.connectedMemories.length} memoria{agent.connectedMemories.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-foreground">Memoria Persistente</h4>
            <p className="text-xs text-muted-foreground">Recordar contexto entre sesiones</p>
          </div>
          <div className={`w-9 h-5 rounded-full transition-colors ${agent.persistentMemory ? "bg-primary" : "bg-muted"}`}>
            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transform transition-transform mt-0.5 ${
              agent.persistentMemory ? "translate-x-4.5 ml-0.5" : "translate-x-0.5"
            }`} />
          </div>
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
