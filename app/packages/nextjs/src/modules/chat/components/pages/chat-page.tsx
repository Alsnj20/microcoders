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
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Left Sidebar Navigation */}
      <ChatSidebar userState={userState} agents={agents} />

      {/* Main Chat Workspace */}
      <main className="flex-1 lg:ml-72 flex flex-col h-full bg-background relative">
        {/* Top Navigation Header */}
        <ChatHeader activeAgentName={activeAgent?.name} />

        {/* Messages Stream Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
          <div className="w-full max-w-4xl flex flex-col gap-6 pt-4 pb-32">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} {...msg} />
            ))}
          </div>
        </div>

        {/* Bottom Message Input Composer */}
        <ChatInput onSendMessage={sendMessage} />
      </main>
    </div>
  );
}
