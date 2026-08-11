import { keccak256, toHex } from "viem";
import { api } from "./client";
import { pinToIpfs, retrieveFromIpfs } from "./ipfs";
import { encryptData, decryptData, createWalletEnvelope, decryptWalletEnvelope } from "~~/services/crypto/envelope";
import { generateKData } from "~~/services/crypto/keys";
import { arrayBufferToBase64, base64ToArrayBuffer } from "~~/services/crypto/utils";
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

export async function saveConversation(
  conversation: ConversationData,
  kWallet?: Uint8Array | null,
): Promise<string | null> {
  // Ensure the chat exists on-chain first
  let chatId = conversation.onChainId;
  if (!chatId) {
    chatId = (await createConversation(conversation.title)) || undefined;
    if (!chatId) return null;
  }

  const toStore: ConversationData = { ...conversation, onChainId: chatId };
  const cid = await pinConversation(toStore, kWallet);
  const hash = hashConversation(toStore);
  const updated = await updateConversation(chatId, toStore.title, cid, hash);
  if (!updated) {
    throw new Error(`Failed to update chat ${chatId} on-chain`);
  }
  return cid;
}

// Conversation blueprint: encrypt messages with kWallet → pin to IPFS.
// On-chain only stores name + cid + hash, mirroring the agents/memories flow.
async function pinConversation(conversation: ConversationData, kWallet?: Uint8Array | null): Promise<string> {
  if (!kWallet) {
    return `dev-${Date.now()}`;
  }

  const kData = generateKData();
  const ciphertext = await encryptData(JSON.stringify(conversation), kData);
  const walletEnvelope = await createWalletEnvelope(kData, kWallet);

  const ipfsPayload = {
    ciphertext: arrayBufferToBase64(ciphertext),
    walletEnvelope: arrayBufferToBase64(walletEnvelope),
    recoveryEnvelope: "",
  };

  const rawBytes = new TextEncoder().encode(JSON.stringify(ipfsPayload));
  const base64Payload = arrayBufferToBase64(rawBytes);
  const result = await pinToIpfs(base64Payload, conversation.title);
  return result.cid;
}

export async function loadConversationMessages(
  chatId: string,
  cid: string,
  kWallet?: Uint8Array | null,
): Promise<ChatMessage[]> {
  if (!cid || !kWallet || cid.startsWith("dev-") || cid.startsWith("chat-")) return [];
  try {
    const base64Data = await retrieveFromIpfs(cid);
    const jsonStr = new TextDecoder().decode(base64ToArrayBuffer(base64Data));
    const envelope = JSON.parse(jsonStr);

    const kData = await decryptWalletEnvelope(base64ToArrayBuffer(envelope.walletEnvelope), kWallet);
    const plaintext = await decryptData(base64ToArrayBuffer(envelope.ciphertext), kData);

    const data = JSON.parse(plaintext) as ConversationData;
    return data.messages || [];
  } catch (err) {
    console.error(`Failed to load conversation ${chatId} messages:`, err);
    return [];
  }
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
        cid: chat.cid,
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
