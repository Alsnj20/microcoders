"use client";

import { retrieveFromIpfs } from "~~/services/api/ipfs";
import { decryptData, decryptWalletEnvelope } from "~~/services/crypto/envelope";
import { arrayBufferToBase64, base64ToArrayBuffer } from "~~/services/crypto/utils";

interface AgentBlueprint {
  name?: string;
  personality?: string;
  instructions?: string;
  description?: string;
  icon?: string;
  persistentMemory?: boolean;
}

/**
 * Fetches and decrypts an agent blueprint from IPFS. Returns the decrypted
 * blueprint, or null when the CID is a placeholder / kWallet is missing / IPFS
 * is unreachable.
 */
export async function fetchAgentBlueprint(
  cid: string,
  kWallet: Uint8Array | null,
): Promise<AgentBlueprint | null> {
  if (!kWallet || !cid || cid.startsWith("dev-")) return null;
  try {
    const base64Data = await retrieveFromIpfs(cid);
    const jsonStr = new TextDecoder().decode(base64ToArrayBuffer(base64Data));
    const envelope = JSON.parse(jsonStr);
    const kData = await decryptWalletEnvelope(base64ToArrayBuffer(envelope.walletEnvelope), kWallet);
    const plaintext = await decryptData(base64ToArrayBuffer(envelope.ciphertext), kData);
    try {
      return JSON.parse(plaintext) as AgentBlueprint;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

/** Resolves the display name of an agent from its IPFS blueprint. */
export async function resolveAgentNameFromIpfs(
  cid: string,
  kWallet: Uint8Array | null,
  fallbackName: string,
): Promise<string> {
  const blueprint = await fetchAgentBlueprint(cid, kWallet);
  if (blueprint?.name && blueprint.name.trim().length > 0) return blueprint.name;
  return fallbackName;
}
