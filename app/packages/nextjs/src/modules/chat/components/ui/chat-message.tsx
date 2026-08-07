"use client";

import { ChatBubble } from "../../../../../components/ui/chat";
import type { ChatMessage as ChatMessageType } from "../../types/chat";

export function ChatMessage({ role, content, timestamp }: ChatMessageType) {
  return <ChatBubble role={role} content={content} timestamp={timestamp} />;
}
