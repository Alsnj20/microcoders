import { keccak256, toHex } from "viem";
import { api } from "./client";
import type { ChatConversation, ChatMessage } from "~~/src/modules/chat/types/chat";

export interface StoredConversation {
  id: string;
  onChainId?: string;
  title: string;
  cid?: string;
  messageCount: number;
  createdAt: string;
}

export interface ConversationData {
  id: string;
  onChainId?: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

export async function createConversation(name: string): Promise<string | null> {
  try {
    const res = await api.chat.create.$post({ json: { name } });
    if (res.ok) {
      const data = await res.json();
      return data.chatId;
    }
    return null;
  } catch {
    return null;
  }
}

export async function updateConversation(
  chatId: string,
  name: string,
  cid: string,
  hash: string,
): Promise<boolean> {
  try {
    const res = await api.chat[":id"].$put({
      param: { id: chatId },
      json: { name, cid, hash },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function hashConversation(conversation: ConversationData): string {
  const content = JSON.stringify({
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    messages: conversation.messages.map(m => ({ role: m.role, content: m.content })),
  });
  return keccak256(toHex(content));
}

export async function saveConversation(conversation: ConversationData): Promise<string | null> {
  // If conversation has an onChainId, update it
  if (conversation.onChainId) {
    const cid = `chat-${conversation.onChainId}-${Date.now()}`;
    const hash = hashConversation(conversation);
    await updateConversation(conversation.onChainId, conversation.title, cid, hash);
    return cid;
  }

  // Otherwise create a new one
  const chatId = await createConversation(conversation.title);
  if (chatId) {
    const cid = `chat-${chatId}-${Date.now()}`;
    const hash = hashConversation(conversation);
    await updateConversation(chatId, conversation.title, cid, hash);
    return cid;
  }
  return null;
}

export async function listConversations(): Promise<ChatConversation[]> {
  try {
    const res = await api.chat.list.$get();
    if (res.ok) {
      const data = await res.json();
      return (data.chats || []).map((chat: any) => ({
        id: chat.chatId,
        onChainId: chat.chatId,
        title: chat.name,
        lastMessage: undefined,
        timestamp: new Date(chat.createdAt * 1000).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export async function deleteConversation(chatId: string): Promise<boolean> {
  try {
    const res = await api.chat[":id"].$delete({
      param: { id: chatId },
    });
    return res.ok;
  } catch {
    return false;
  }
}
