"use client";

import { ChatBubble } from "../../../../../components/ui/chat";
import type { ChatMessage as ChatMessageType } from "../../types/chat";

interface ChatMessageProps extends ChatMessageType {
  onSaveAsMemory?: (messageId: string) => void;
}

export function ChatMessage({ id, role, content, timestamp, memoryCid, onSaveAsMemory }: ChatMessageProps) {
  return (
    <div className="group relative">
      <ChatBubble role={role} content={content} timestamp={timestamp} />
      {role === "assistant" && onSaveAsMemory && !memoryCid && (
        <button
          onClick={() => onSaveAsMemory(id)}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-background border border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
          title="Guardar como memoria"
        >
          <span className="material-symbols-outlined text-sm">save</span>
        </button>
      )}
      {memoryCid && (
        <div className="absolute top-2 right-2 flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
          <span className="material-symbols-outlined text-xs">check</span>
          {memoryCid}
        </div>
      )}
    </div>
  );
}
