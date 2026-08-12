"use client";

import Link from "next/link";
import { useDisconnect } from "wagmi";
import { useGlobalState } from "~~/services/store/store";
import {
  LateralBar,
  LateralBarContent,
  LateralBarFooter,
  LateralBarSection,
  LateralBarSectionButton,
} from "../../../../../components/ui/lateral-bar";
import type { AgentBlueprint, ChatConversation, UserProtocolState } from "../../types/chat";

interface ChatSidebarProps {
  userState: UserProtocolState;
  agents: AgentBlueprint[];
  conversations: ChatConversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation?: (id: string) => void;
  forceVisible?: boolean;
}

function getPlanName(balance: number): string {
  if (balance >= 200) return "Pro";
  if (balance >= 100) return "Regular";
  if (balance >= 50) return "Starter";
  return "Free";
}

function getPlanMax(balance: number): number {
  if (balance >= 200) return 200;
  if (balance >= 100) return 100;
  if (balance >= 50) return 50;
  return 50;
}

export function ChatSidebar({
  userState,
  agents,
  conversations,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  forceVisible = false,
}: ChatSidebarProps) {
  const { creditBalance, session } = useGlobalState();
  const { disconnect } = useDisconnect();
  const planName = getPlanName(creditBalance);
  const planMax = getPlanMax(creditBalance);
  const barPercent = Math.min(100, (creditBalance / planMax) * 100);

  return (
    <LateralBar forceVisible={forceVisible} className="space-y-4">
      {/* New Conversation Button */}
      <div className="px-4 py-2">
        <button
          type="button"
          onClick={onCreateConversation}
          className="w-full bg-primary text-primary-foreground font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all"
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
              <div className="flex items-center justify-between w-full">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{conv.title}</p>
                  <p className="text-xs text-muted-foreground/60">{conv.timestamp}</p>
                </div>
                {onDeleteConversation && (
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteConversation(conv.id);
                    }}
                    className="shrink-0 p-1 rounded  text-muted-foreground hover:text-destructive text-xs transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                )}
              </div>
            </LateralBarSectionButton>
          ))}
        </LateralBarSection>
      </LateralBarContent>

      {/* Credit Usage Card */}
      <LateralBarFooter>

        {/* Credits Card */}
        <div className="p-4 rounded-xl bg-background border border-border">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold text-foreground tracking-wider">USO DE CRÉDITOS</h4>
            <span className="material-symbols-outlined text-sm text-muted-foreground">info</span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1">
            <span className="text-2xl font-bold text-foreground">{creditBalance}</span>
            <span className="text-sm font-medium text-muted-foreground">MC</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Disponible</p>
          <div className="h-2 bg-border rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-primary/80 rounded-full transition-all duration-500"
              style={{ width: `${barPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Plan actual: <span className="font-medium text-foreground">{planName}</span>
            </p>
            <Link href="/profile" className="text-xs font-medium text-primary hover:text-primary/80">
              Ver planes
            </Link>
          </div>
        </div>
      </LateralBarFooter>
    </LateralBar>
  );
}
