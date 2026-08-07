"use client";

import { useChat } from "../../hooks/use-chat";
import { ChatHeader } from "../ui/chat-header";
import { ChatInput } from "../ui/chat-input";
import { ChatMessage } from "../ui/chat-message";
import { ChatSidebar } from "../ui/chat-sidebar";

export function ChatPage() {
  const { messages, agents, userState, sendMessage } = useChat();

  const activeAgent = agents.find((a) => a.id === userState.activeAgentId);

  return (
    <div className="flex h-screen overflow-hidden text-foreground bg-background">
      {/* Side Navigation Bar */}
      <ChatSidebar userState={userState} agents={agents} />

      {/* Main Content Workspace */}
      <main className="lg:ml-70 flex-1 flex flex-col h-full bg-background relative">
        {/* Top App Bar Header */}
        <ChatHeader activeAgentName={activeAgent?.name} />

        {/* Chat Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col items-center">
          <div className="w-full max-w-4xl flex flex-col gap-6 pt-4 pb-28">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} {...msg} />
            ))}
          </div>
        </div>

        {/* Bottom Input Composer */}
        <ChatInput onSendMessage={sendMessage} />
      </main>
    </div>
  );
}
