"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SlideOver } from "~~/components/ui/slide-over";
import { ChatEmptyState, ChatMessages } from "../../../../../components/ui/chat";
import { useChat } from "../../hooks/use-chat";
import { AgentSelectorModal } from "../ui/chat-agent-modal";
import { ChatContextPanel } from "../ui/chat-context-panel";
import { ChatInput } from "../ui/chat-input";
import { MemorySelectorModal } from "../ui/chat-memory-modal";
import { ChatMessage } from "../ui/chat-message";
import { ChatMobileHeader } from "../ui/chat-mobile-header";
import { ChatSidebar } from "../ui/chat-sidebar";

export function ChatPage() {
  const router = useRouter();
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  const {
    messages,
    agents,
    conversations,
    selectedConversationId,
    linkedMemories,
    onSelectConversation,
    onCreateConversation,
    onDeleteConversation,
    onSelectAgent,
    onLinkMemory,
    onUnlinkMemory,
    onSaveAsMemory,
    userState,
    sendMessage,
    isGenerating,
  } = useChat();

  const activeAgent = agents.find(a => a.id === userState.activeAgentId);

  const handleSelectConversation = (id: string) => {
    onSelectConversation(id);
    setShowLeftPanel(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] overflow-hidden text-foreground bg-background">
      {/* Mobile header - only on small screens */}
      <ChatMobileHeader
        onOpenLeft={() => setShowLeftPanel(true)}
        onOpenRight={() => setShowRightPanel(true)}
        onCreateConversation={onCreateConversation}
        agentName={activeAgent?.name}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - desktop inline */}
        <div className="hidden lg:flex">
          <ChatSidebar
            userState={userState}
            agents={agents}
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={onSelectConversation}
            onCreateConversation={onCreateConversation}
            onDeleteConversation={onDeleteConversation}
          />
        </div>

        {/* Left Sidebar - mobile slide-over */}
        <SlideOver
          open={showLeftPanel}
          onClose={() => setShowLeftPanel(false)}
          side="left"
          title="Historial de conversaciones"
          width="w-70"
        >
          <ChatSidebar
            userState={userState}
            agents={agents}
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            onCreateConversation={onCreateConversation}
            onDeleteConversation={onDeleteConversation}
            forceVisible
          />
        </SlideOver>

        {/* Center: Chat Window */}
        <main className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
          <ChatMessages empty={messages.length === 0}>
            {messages.length === 0 ? (
              <ChatEmptyState
                description={activeAgent?.description || "Selecciona un agente o inicia una nueva conversación."}
              />
            ) : (
              messages.map(msg => (
                <ChatMessage
                  key={msg.id}
                  {...msg}
                  onSaveAsMemory={msg.role === "assistant" ? onSaveAsMemory : undefined}
                />
              ))
            )}
          </ChatMessages>

          <ChatInput onSendMessage={sendMessage} disabled={isGenerating} />
        </main>

        {/* Right Panel - desktop inline */}
        <div className="hidden xl:flex">
          <ChatContextPanel
            activeAgent={activeAgent}
            linkedMemories={linkedMemories}
            onSelectAgent={() => setShowAgentModal(true)}
            onAddMemory={() => setShowMemoryModal(true)}
          />
        </div>

        {/* Right Panel - mobile slide-over */}
        <SlideOver
          open={showRightPanel}
          onClose={() => setShowRightPanel(false)}
          side="right"
          title="Contexto"
          width="w-70"
        >
          <ChatContextPanel
            activeAgent={activeAgent}
            linkedMemories={linkedMemories}
            onSelectAgent={() => {
              setShowRightPanel(false);
              setShowAgentModal(true);
            }}
            onAddMemory={() => {
              setShowRightPanel(false);
              setShowMemoryModal(true);
            }}
          />
        </SlideOver>
      </div>

      {/* Agent Selector Modal */}
      {showAgentModal && (
        <AgentSelectorModal
          agents={agents}
          activeAgentId={userState.activeAgentId}
          onSelect={onSelectAgent}
          onClose={() => setShowAgentModal(false)}
          onCreateNew={() => {
            setShowAgentModal(false);
            router.push("/agents");
          }}
        />
      )}

      {/* Memory Selector Modal */}
      {showMemoryModal && (
        <MemorySelectorModal
          linkedMemoryIds={linkedMemories.map(m => m.memoryId)}
          onLink={onLinkMemory}
          onUnlink={onUnlinkMemory}
          onClose={() => setShowMemoryModal(false)}
        />
      )}
    </div>
  );
}
