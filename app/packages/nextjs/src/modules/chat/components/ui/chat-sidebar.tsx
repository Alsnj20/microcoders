"use client";

import {
  LateralBar,
  LateralBarContent,
  LateralBarHeader,
  LateralBarSection,
  LateralBarSectionButton,
} from "../../../../../components/ui/lateral-bar";
import type { AgentBlueprint, ChatConversation, UserProtocolState } from "../../types/chat";

interface ChatSidebarProps {
  userState: UserProtocolState;
  agents: AgentBlueprint[];
  conversations: ChatConversation[];
  selectedConversationId: string;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
}

export function ChatSidebar({
  userState,
  agents,
  conversations,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
}: ChatSidebarProps) {
  return (
    <LateralBar>
      {/* User Info Header */}
      {/*<LateralBarHeader>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="size-12 rounded-full bg-muted border border-border flex items-center justify-center">
              <span className="material-symbols-outlined text-xl text-muted-foreground">person</span>
            </div>
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
      </LateralBarHeader>*/}

      {/* New Conversation Button */}
      <div className="px-4 py-2">
        <button
          type="button"
          onClick={onCreateConversation}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Nuevo chat
        </button>
      </div>

      <LateralBarContent>
        {/* Conversations List */}
        <LateralBarSection title="CHATS">
          {conversations.map(conv => (
            <LateralBarSectionButton
              key={conv.id}
              onClick={() => onSelectConversation(conv.id)}
              isActive={selectedConversationId === conv.id}
              icon="chat_bubble"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground break-words">{conv.title}</p>
                {conv.lastMessage && <p className="text-xs text-muted-foreground break-words">{conv.lastMessage}</p>}
                <p className="text-xs text-muted-foreground/60">{conv.timestamp}</p>
              </div>
            </LateralBarSectionButton>
          ))}
        </LateralBarSection>
      </LateralBarContent>
    </LateralBar>
  );
}
