"use client";

import {
  LateralBar,
  LateralBarContent,
  LateralBarFooter,
  LateralBarHeader,
  LateralBarSection,
  LateralBarSectionButton,
} from "../../../../../components/ui/lateral-bar";
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
    <LateralBar>
      {/* Agent Selector Header */}
      <LateralBarHeader>
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/50 border border-border/40">
          <span className="text-2xl">{agent?.icon || "🤖"}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{agent?.name || "Sin agente"}</p>
          </div>
          <span className="material-symbols-outlined text-lg text-muted-foreground">expand_more</span>
        </div>
      </LateralBarHeader>

      {/* New Conversation Button */}
      <div className="px-4 py-2">
        <button
          type="button"
          onClick={onCreateConversation}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva conversación
        </button>
      </div>

      <LateralBarContent>
        {/* Conversations List */}
        <LateralBarSection title="CONVERSACIONES">
          {conversations.map(conv => (
            <LateralBarSectionButton
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              isActive={selectedConversationId === conv.id}
              icon="chat_bubble"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{conv.title}</p>
                {conv.lastMessage && (
                  <p className="text-xs text-muted-foreground truncate text-wrap">{conv.lastMessage}</p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-1">{conv.timestamp}</p>
              </div>
            </LateralBarSectionButton>
          ))}
        </LateralBarSection>
      </LateralBarContent>

      {/* Banner */}
      <LateralBarFooter>
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
      </LateralBarFooter>
    </LateralBar>
  );
}
