"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatEmptyState, ChatMessages } from "../../../../../components/ui/chat";
import { useChat } from "../../hooks/use-chat";
import { ChatInput } from "../ui/chat-input";
import { ChatMessage } from "../ui/chat-message";
import { ChatSidebar } from "../ui/chat-sidebar";
import { ChatContextPanel } from "../ui/chat-context-panel";
import { AgentSelectorModal } from "../ui/chat-agent-modal";
import { MemorySelectorModal } from "../ui/chat-memory-modal";

export function ChatPage() {
  const router = useRouter();
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

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
  } = useChat();

  const activeAgent = agents.find((a) => a.id === userState.activeAgentId);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden text-foreground bg-background">
      {/* Left Sidebar */}
      <ChatSidebar
        userState={userState}
        agents={agents}
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={onSelectConversation}
        onCreateConversation={onCreateConversation}
        onDeleteConversation={onDeleteConversation}
      />

      {/* Center: Chat Window */}
      <main className="flex-1 flex flex-col h-full bg-background relative">
        {/* Chat Scroll Area */}
        <ChatMessages empty={messages.length === 0}>
          {messages.length === 0 ? (
            <ChatEmptyState
              description={activeAgent?.description || "Selecciona un agente o inicia una nueva conversación."}
            />
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg.id} {...msg} onSaveAsMemory={msg.role === "assistant" ? onSaveAsMemory : undefined} />
            ))
          )}
        </ChatMessages>

        {/* Bottom Input Composer */}
        <ChatInput onSendMessage={sendMessage} />
      </main>

      {/* Right Panel: Context + Memories */}
      <ChatContextPanel
        activeAgent={activeAgent}
        linkedMemories={linkedMemories}
        onSelectAgent={() => setShowAgentModal(true)}
        onAddMemory={() => setShowMemoryModal(true)}
      />

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
          linkedMemoryIds={linkedMemories.map((m) => m.memoryId)}
          onLink={onLinkMemory}
          onUnlink={onUnlinkMemory}
          onClose={() => setShowMemoryModal(false)}
        />
      )}
    </div>
  );
}
