"use client";

import type { Agent, Conversation } from "../../types/agent";

interface AgentSidebarProps {
  agent: Agent | null;
  conversations: Conversation[];
  selectedConversationId: string;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
}

export function AgentSidebar({
  agent,
  conversations,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
}: AgentSidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-72 min-h-[calc(100vh-4rem)] border-r border-border/40 bg-background">
      {/* Agent Selector */}
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50 border border-border/40">
          <span className="text-2xl">{agent?.icon || "🤖"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{agent?.name || "Sin agente"}</p>
            <p className="text-xs text-muted-foreground truncate">{agent?.model}</p>
          </div>
          <span className="material-symbols-outlined text-lg text-muted-foreground">expand_more</span>
        </div>
      </div>

      {/* New Conversation Button */}
      <div className="p-4">
        <button
          type="button"
          onClick={onCreateConversation}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva conversación
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3">
        <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-3 px-1">CONVERSACIONES</p>
        <div className="space-y-1">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              onClick={() => onSelectConversation(conv.id)}
              className={`w-full text-left px-3 py-3 rounded-xl transition-all ${
                selectedConversationId === conv.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50 border border-transparent"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-sm text-muted-foreground">chat_bubble</span>
                <p className="text-sm font-medium text-foreground truncate">{conv.title}</p>
              </div>
              {conv.lastMessage && (
                <p className="text-xs text-muted-foreground truncate pl-6">{conv.lastMessage}</p>
              )}
              <p className="text-xs text-muted-foreground/60 pl-6 mt-1">{conv.timestamp}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Banner */}
      <div className="p-4 border-t border-border/40">
        <div className="p-4 rounded-2xl bg-muted/30 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">👾</span>
            <div>
              <p className="text-xs font-semibold text-foreground">Tus memorias.</p>
              <p className="text-xs font-semibold text-foreground">Tu control.</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">En blockchain, para siempre.</p>
        </div>
      </div>
    </aside>
  );
}
