"use client";

import { retrieveFromIpfs } from "~~/services/api/ipfs";
import { decryptData, decryptWalletEnvelope } from "~~/services/crypto/envelope";
import { arrayBufferToBase64, base64ToArrayBuffer } from "~~/services/crypto/utils";

/**
 * Resolves the display title of a memory from its IPFS payload (which holds
 * { title, description, content }). Falls back to the on-chain name when the
 * CID is a placeholder (dev-/chat-export-), there is no kWallet, or the payload
 * has no title yet. Returns the resolved title or null.
 */
export async function resolveMemoryTitleFromIpfs(
  cid: string,
  kWallet: Uint8Array | null,
  fallbackName: string,
): Promise<string> {
  if (!kWallet || !cid || cid.startsWith("dev-") || cid.startsWith("chat-export-")) {
    return fallbackName;
  }
  try {
    const base64Data = await retrieveFromIpfs(cid);
    const jsonStr = new TextDecoder().decode(base64ToArrayBuffer(base64Data));
    const envelope = JSON.parse(jsonStr);
    const kData = await decryptWalletEnvelope(base64ToArrayBuffer(envelope.walletEnvelope), kWallet);
    const plaintext = await decryptData(base64ToArrayBuffer(envelope.ciphertext), kData);
    let payload: unknown;
    try {
      payload = JSON.parse(plaintext);
    } catch {
      return fallbackName;
    }
    if (payload && typeof payload === "object" && "title" in payload) {
      const t = (payload as { title?: unknown }).title;
      if (typeof t === "string" && t.trim().length > 0) return t;
    }
    return fallbackName;
  } catch {
    return fallbackName;
  }
}

/** Same as above but silently returns the fallback name when IPFS is unreachable. */
export async function resolveMemoryTitleSafe(
  cid: string,
  kWallet: Uint8Array | null,
  fallbackName: string,
): Promise<string> {
  try {
    return await resolveMemoryTitleFromIpfs(cid, kWallet, fallbackName);
  } catch {
    return fallbackName;
  }
}
