"use client";

import { useChat } from "../../hooks/use-chat";
import { ChatInput } from "../ui/chat-input";
import { ChatMessage } from "../ui/chat-message";
import { ChatSidebar } from "../ui/chat-sidebar";
import { ChatMessages, ChatEmptyState } from "../../../../../components/ui/chat";

export function ChatPage() {
  const {
    messages,
    agents,
    conversations,
    selectedConversationId,
    onSelectConversation,
    onCreateConversation,
    userState,
    sendMessage,
  } = useChat();

  const activeAgent = agents.find((a) => a.id === userState.activeAgentId);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden text-foreground bg-background">
      {/* Side Navigation Bar */}
      <ChatSidebar
        userState={userState}
        agents={agents}
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={onSelectConversation}
        onCreateConversation={onCreateConversation}
      />

      <main className="flex-1 flex flex-col h-full bg-background relative">
        {/* Chat Scroll Area */}
        <ChatMessages empty={messages.length === 0}>
          {messages.length === 0 ? (
            <ChatEmptyState
              description={activeAgent?.description || "Selecciona un agente o inicia una nueva conversación."}
            />
          ) : (
            messages.map((msg) => (
              <ChatMessage key={msg.id} {...msg} />
            ))
          )}
        </ChatMessages>

        {/* Bottom Input Composer */}
        <ChatInput onSendMessage={sendMessage} />
      </main>
    </div>
  );
}
