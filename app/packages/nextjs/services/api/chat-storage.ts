import { pinToIpfs, retrieveFromIpfs } from "./ipfs";
import type { ChatMessage, ChatConversation } from "~~/src/modules/chat/types/chat";

const INDEX_KEY = "mc_chat_conversations";

export interface StoredConversation {
  id: string;
  title: string;
  cid: string;
  messageCount: number;
  createdAt: string;
}

export interface ConversationData {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
}

function getLocalIndex(): StoredConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalIndex(entries: StoredConversation[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(INDEX_KEY, JSON.stringify(entries));
}

export async function saveConversation(conversation: ConversationData): Promise<string | null> {
  try {
    const payload = JSON.stringify(conversation);
    const b64 = btoa(unescape(encodeURIComponent(payload)));
    const result = await pinToIpfs(b64, `chat-${conversation.id}`);

    const index = getLocalIndex();
    const existing = index.findIndex((e) => e.id === conversation.id);
    const entry: StoredConversation = {
      id: conversation.id,
      title: conversation.title,
      cid: result.cid,
      messageCount: conversation.messages.length,
      createdAt: conversation.createdAt,
    };

    if (existing >= 0) {
      index[existing] = entry;
    } else {
      index.unshift(entry);
    }
    saveLocalIndex(index);
    return result.cid;
  } catch {
    const index = getLocalIndex();
    const existing = index.findIndex((e) => e.id === conversation.id);
    const entry: StoredConversation = {
      id: conversation.id,
      title: conversation.title,
      cid: `local-${conversation.id}`,
      messageCount: conversation.messages.length,
      createdAt: conversation.createdAt,
    };
    if (existing >= 0) {
      index[existing] = entry;
    } else {
      index.unshift(entry);
    }
    saveLocalIndex(index);
    return null;
  }
}

export async function loadConversation(id: string): Promise<ConversationData | null> {
  const index = getLocalIndex();
  const entry = index.find((e) => e.id === id);
  if (!entry) return null;

  if (entry.cid.startsWith("local-")) return null;

  try {
    const rawB64 = await retrieveFromIpfs(entry.cid);
    const json = decodeURIComponent(escape(atob(rawB64)));
    return JSON.parse(json) as ConversationData;
  } catch (err) {
    console.error("Failed to load conversation from IPFS:", err);
    return null;
  }
}

export function listConversations(): ChatConversation[] {
  return getLocalIndex().map((e) => ({
    id: e.id,
    title: e.title,
    lastMessage: undefined,
    timestamp: new Date(e.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));
}

export function deleteConversationLocal(id: string) {
  const index = getLocalIndex().filter((e) => e.id !== id);
  saveLocalIndex(index);
}
