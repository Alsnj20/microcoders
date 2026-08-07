"use client";

import type { AgentBlueprint, UserProtocolState } from "../../types/chat";

interface ChatSidebarProps {
  userState: UserProtocolState;
  agents: AgentBlueprint[];
  onSelectAgent?: (agentId: string) => void;
}

export function ChatSidebar({ userState, agents, onSelectAgent }: ChatSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-70 bg-muted border-r border-border flex flex-col py-6 z-50 hidden lg:flex">
      {/* User Info Header */}
      <div className="px-6 flex items-center gap-4 mb-6">
        <div className="relative shrink-0">
          <img
            className="size-12 rounded-full object-cover border border-border"
            alt={userState.username}
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCfwydSf4eT5deF0TsqX2HrkwueTomzy6nMFqGHTj_6_5F3Ch4c44uRurvTdYtJaCljYTnLKjNV6Ar4QtT3XNQlWUbzCZd7kdlsDNTKqM-hLMrk3_9KMWR4jiWkEORNFF7pwOsktnySVf8GGiMxGQFt4dWVVpO60yAIotruOAE-mIlCJjkh9YJq69R8BO_p7NV04mMUwrdiIHN2HB1_xUdpv4z3jPCIt-ZoUNj2KCTG1EncHAUEsY7Z"
          />
          <div className="absolute bottom-0 right-0 size-3 bg-primary rounded-full border-2 border-muted" />
        </div>
        <div className="overflow-hidden">
          <h2 className="font-['Source_Serif_4'] text-lg font-bold text-foreground truncate">
            {userState.username}
          </h2>
          <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded bg-warning/30 text-secondary text-xs font-semibold">
            <span className="material-symbols-outlined text-xs mr-1">toll</span>
            <span>{userState.memoryCredits} MC</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-6 scrollbar-hide">
        {/* Chats Section */}
        <div>
          <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Chats
          </h3>
          <div className="space-y-1">
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 border-l-4 border-primary bg-input text-primary font-bold transition-all duration-200 rounded-r-lg text-left"
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                chat_bubble
              </span>
              <span className="text-sm">Solana & DeFi Analysis</span>
            </button>

            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-surface-container-low transition-colors border-l-4 border-transparent hover:border-border rounded-r-lg text-left"
            >
              <span className="material-symbols-outlined text-xl">chat_bubble</span>
              <span className="text-sm">Knowledge Base Queries</span>
            </button>
          </div>
        </div>

        {/* Agentes Section */}
        <div>
          <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Agentes
          </h3>
          <div className="space-y-1">
            {agents.map((agent) => {
              const isSelected = userState.activeAgentId === agent.id;
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onSelectAgent?.(agent.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-all duration-200 border-l-4 rounded-r-lg text-left ${
                    isSelected
                      ? "border-primary bg-input text-primary font-bold"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-container-low border-transparent hover:border-border"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-xl"
                    style={{ fontVariationSettings: isSelected ? "'FILL' 1" : undefined }}
                  >
                    {agent.icon}
                  </span>
                  <span className="text-sm truncate">{agent.name}</span>
                </button>
              );
            })}
          </div>

          <div className="px-4 mt-3 flex gap-2">
            <button
              type="button"
              className="flex-1 py-1.5 rounded-lg bg-input text-foreground text-xs font-semibold hover:bg-surface-container-high transition-colors border border-border"
            >
              Add
            </button>
            <button
              type="button"
              className="flex-1 py-1.5 rounded-lg bg-input text-foreground text-xs font-semibold hover:bg-surface-container-high transition-colors border border-border"
            >
              Ver más
            </button>
          </div>
        </div>

        {/* Memoria Section */}
        <div>
          <h3 className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Memoria
          </h3>
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-surface-container-low transition-colors border-l-4 border-transparent hover:border-border rounded-r-lg text-left"
          >
            <span className="material-symbols-outlined text-xl">psychology</span>
            <span className="text-sm">Knowledge Base (SHA-256)</span>
          </button>
        </div>
      </div>

      {/* Footer / Connect Button */}
      <div className="px-4 mt-auto">
        <button
          type="button"
          className="w-full py-3 rounded-full bg-secondary text-secondary-foreground text-sm font-semibold hover:bg-secondary/90 transition-all border border-border"
        >
          Connect Wallet
        </button>
      </div>
    </aside>
  );
}
