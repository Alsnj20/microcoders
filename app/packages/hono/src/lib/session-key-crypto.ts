import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * AES-256-GCM encryption for session key private keys stored in Redis.
 * The encryption key comes from `SESSION_KEY_ENCRYPTION_KEY` (64 hex chars).
 */

function getKey(): Buffer {
  const raw = process.env.SESSION_KEY_ENCRYPTION_KEY;
  if (!raw) throw new Error("SESSION_KEY_ENCRYPTION_KEY is not set");
  return Buffer.from(raw.replace("0x", ""), "hex");
}

export function encryptPrivateKey(privateKey: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(privateKey, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptPrivateKey(payload: string): string {
  const key = getKey();
  const [version, ivHex, tagHex, dataHex] = payload.split(":");
  if (version !== "v1" || !ivHex || !tagHex || !dataHex) {
    throw new Error("Unknown session key encryption format");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}
