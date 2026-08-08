import { pinToIpfs, retrieveFromIpfs } from "./ipfs";
import type { ChatMessage, ChatConversation } from "~~/src/modules/chat/types/chat";

const INDEX_KEY = "mc_chat_conversations";
const DATA_PREFIX = "mc_chat_data_";

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

function saveLocalData(id: string, data: ConversationData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`${DATA_PREFIX}${id}`, JSON.stringify(data));
  } catch {
    // localStorage full - remove oldest entries
    const index = getLocalIndex();
    if (index.length > 5) {
      const removed = index.pop();
      if (removed) localStorage.removeItem(`${DATA_PREFIX}${removed.id}`);
      saveLocalIndex(index);
      localStorage.setItem(`${DATA_PREFIX}${id}`, JSON.stringify(data));
    }
  }
}

function loadLocalData(id: string): ConversationData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${DATA_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveConversation(conversation: ConversationData): Promise<string | null> {
  // Always save to localStorage first (immediate persistence)
  saveLocalData(conversation.id, conversation);

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

  // Try to pin to IPFS (async, non-blocking)
  try {
    const payload = JSON.stringify(conversation);
    const b64 = btoa(unescape(encodeURIComponent(payload)));
    const result = await pinToIpfs(b64, `chat-${conversation.id}`);
    // Update cid to IPFS cid
    entry.cid = result.cid;
    if (existing >= 0) {
      index[existing] = entry;
    } else {
      index[0] = entry;
    }
    saveLocalIndex(index);
    return result.cid;
  } catch {
    // IPFS not available - localStorage already saved
    return null;
  }
}

export async function loadConversation(id: string): Promise<ConversationData | null> {
  // Try localStorage first (immediate)
  const local = loadLocalData(id);
  if (local) return local;

  // Try IPFS
  const index = getLocalIndex();
  const entry = index.find((e) => e.id === id);
  if (!entry || entry.cid.startsWith("local-")) return null;

  try {
    const rawB64 = await retrieveFromIpfs(entry.cid);
    const json = decodeURIComponent(escape(atob(rawB64)));
    const data = JSON.parse(json) as ConversationData;
    // Cache locally
    saveLocalData(id, data);
    return data;
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
  if (typeof window !== "undefined") {
    localStorage.removeItem(`${DATA_PREFIX}${id}`);
  }
}
