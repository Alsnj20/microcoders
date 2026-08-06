"use client";

import type { AgentBlueprint, UserProtocolState } from "../../types/chat";

interface ChatSidebarProps {
  userState: UserProtocolState;
  agents: AgentBlueprint[];
  onSelectAgent?: (agentId: string) => void;
}

export function ChatSidebar({ userState, agents, onSelectAgent }: ChatSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-72 bg-muted/50 border-r border-border/60 shadow-xl flex flex-col py-6 z-50 hidden lg:flex">
      {/* User Info Header */}
      <div className="px-6 flex items-center gap-4 mb-8">
        <div className="relative shrink-0">
          <img
            className="w-12 h-12 rounded-xl object-cover border border-border/80 shadow-sm"
            alt={userState.username}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfwydSf4eT5deF0TsqX2HrkwueTomzy6nMFqGHTj_6_5F3Ch4c44uRurvTdYtJaCljYTnLKjNV6Ar4QtT3XNQlWUbzCZd7kdlsDNTKqM-hLMrk3_9KMWR4jiWkEORNFF7pwOsktnySVf8GGiMxGQFt4dWVVpO60yAIotruOAE-mIlCJjkh9YJq69R8BO_p7NV04mMUwrdiIHN2HB1_xUdpv4z3jPCIt-ZoUNj2KCTG1EncHAUEsY7Z"
          />
          <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background" />
        </div>
        <div className="overflow-hidden">
          <h2 className="text-base font-bold text-foreground truncate">{userState.username}</h2>
          <div className="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold font-mono">
            <span className="material-symbols-outlined text-xs">toll</span>
            <span>{userState.memoryCredits} MC</span>
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6 scrollbar-hide">
        {/* Active Chats */}
        <div>
          <h3 className="px-3 mb-3 text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
            Conversaciones
          </h3>
          <div className="space-y-1">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md transition-all text-left"
            >
              <span className="material-symbols-outlined text-lg">chat_bubble</span>
              <span className="truncate">Análisis DeFi & Contexto</span>
            </button>
          </div>
        </div>

        {/* Agentes Personales */}
        <div>
          <div className="flex items-center justify-between px-3 mb-3">
            <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
              Mis Agentes
            </h3>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-mono">
              AgentRegistry
            </span>
          </div>
          <div className="space-y-1">
            {agents.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onClick={() => onSelectAgent?.(agent.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all text-left ${
                  userState.activeAgentId === agent.id
                    ? "bg-card border border-primary/40 text-foreground font-bold shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <span className="material-symbols-outlined text-lg text-primary">{agent.icon}</span>
                  <span className="truncate">{agent.name}</span>
                </div>
                <span className="text-[10px] font-mono text-muted-foreground">{agent.version}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Memorias / Knowledge Base */}
        <div>
          <div className="flex items-center justify-between px-3 mb-3">
            <h3 className="text-xs font-mono font-bold text-muted-foreground uppercase tracking-wider">
              Nodos de Memoria
            </h3>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-mono">
              SHA-256
            </span>
          </div>
          <div className="p-3 rounded-xl bg-card border border-border/60 space-y-2 text-xs">
            <div className="flex items-center justify-between text-foreground font-semibold">
              <span>Knowledge Base v1.4</span>
              <span className="material-symbols-outlined text-emerald-500 text-base">lock</span>
            </div>
            <p className="text-muted-foreground text-[11px] truncate">
              CID: ipfs://QmX9z7p2W...8hF9aK
            </p>
          </div>
        </div>
      </div>

      {/* Wallet Action Footer */}
      <div className="px-4 mt-auto pt-4 border-t border-border/40">
        <button
          type="button"
          className="w-full py-3 rounded-xl bg-card border border-border/80 hover:border-primary/50 text-foreground font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-base text-primary">account_balance_wallet</span>
          <span>Conectado a Wallet</span>
        </button>
      </div>
    </aside>
  );
}
