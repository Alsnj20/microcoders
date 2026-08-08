"use client";

import { useState } from "react";
import { useAgent } from "../../hooks/use-agent";
import type { Agent } from "../../types/agent";
import { AgentSidebar } from "../ui/agent-sidebar";
import { AgentChat } from "../ui/agent-chat";
import { AgentInfoPanel } from "../ui/agent-info-panel";
import { AgentForm } from "../ui/agent-form";

export function AgentsPage() {
  const {
    agents,
    selectedAgent,
    selectedAgentId,
    setSelectedAgentId,
    selectedConversationId,
    setSelectedConversationId,
    agentConversations,
    currentMessages,
    createAgent,
    updateAgent,
    createConversation,
    sendMessage,
  } = useAgent();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setIsFormOpen(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setIsFormOpen(true);
  };

  const handleFormSubmit = (data: { name: string; description?: string; icon: string; model: "gpt-5.5" | "claude" | "gemini" | "llama3"; personality?: string; tools: string[]; persistentMemory: boolean }) => {
    if (editingAgent) {
      updateAgent(editingAgent.id, data);
    } else {
      createAgent({ ...data, connectedMemories: [] });
    }
  };

  const handleCreateConversation = () => {
    if (selectedAgentId) {
      createConversation(selectedAgentId);
    }
  };

  const handleSendMessage = (content: string) => {
    if (selectedConversationId) {
      sendMessage(selectedConversationId, content);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left Sidebar - Agent Selection + Conversations */}
      <AgentSidebar
        agent={selectedAgent}
        conversations={agentConversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={setSelectedConversationId}
        onCreateConversation={handleCreateConversation}
      />

      {/* Center - Chat */}
      <AgentChat
        agent={selectedAgent}
        messages={currentMessages}
        onSendMessage={handleSendMessage}
      />

      {/* Right Panel - Agent Info */}
      <AgentInfoPanel
        agent={selectedAgent}
        onEdit={handleEditAgent}
      />

      {/* Form Modal */}
      {isFormOpen && (
        <AgentForm
          agent={editingAgent}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setIsFormOpen(false);
            setEditingAgent(null);
          }}
        />
      )}

      {/* Floating Create Button (Mobile) */}
      <button
        type="button"
        onClick={handleCreateAgent}
        className="fixed bottom-20 right-6 lg:hidden w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-all z-40"
      >
        <span className="material-symbols-outlined text-2xl">add</span>
      </button>
    </div>
  );
}
