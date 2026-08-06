"use client";

import type { ChatMessage as ChatMessageType } from "../../types/chat";

export function ChatMessage({ role, avatarUrl, content }: ChatMessageType) {
  const isUser = role === "user";

  return (
    <div
      className={`flex items-end gap-3 max-w-2xl w-full ${isUser ? "ml-auto flex-row-reverse" : "mr-auto flex-row"}`}
    >
      {!isUser ? (
        <img
          src={avatarUrl}
          alt={isUser ? "User Avatar" : "Agent Avatar"}
          className="w-9 h-9 rounded-full border border-border shrink-0 object-cover"
        />
      ) : null}

      {/* Message Bubble */}
      <div
        className={`px-4 py-3 rounded-2xl text-sm md:text-base leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-tr-xs"
            : "bg-muted text-foreground border border-border rounded-tl-xs"
        }`}
      >
        <p className="whitespace-pre-wrap font-sans">{content}</p>
      </div>
    </div>
  );
}
