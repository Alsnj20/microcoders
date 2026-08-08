import { base64ToArrayBuffer } from "./utils";

// PBKDF2 using Web Crypto API
export async function pbkdf2(
  password: string | Uint8Array,
  salt: string,
  iterations: number,
  keyLen: number,
  hash: "SHA-256" | "SHA-512" = "SHA-256",
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const passwordBuffer = typeof password === "string" ? encoder.encode(password) : password;
  const saltBuffer = encoder.encode(salt);

  const baseKey = await window.crypto.subtle.importKey("raw", passwordBuffer as BufferSource, "PBKDF2", false, [
    "deriveBits",
  ]);

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: iterations,
      hash: hash,
    },
    baseKey,
    keyLen * 8,
  );

  return new Uint8Array(derivedBits);
}

// K_wallet: derived from wallet signature
export async function deriveKWallet(signature: string): Promise<Uint8Array> {
  // Derive a 256-bit (32 bytes) key from the wallet signature
  return pbkdf2(signature, "memorychain-session", 100000, 32, "SHA-256");
}

// K_recovery: derived from 12-word recovery code
export async function deriveKRecovery(recoveryCode: string): Promise<Uint8Array> {
  // Normalize recovery code text (trimmed and lowercased)
  const normalized = recoveryCode.trim().toLowerCase().replace(/\s+/g, " ");
  return pbkdf2(normalized, "memorychain-recovery", 100000, 32, "SHA-256");
}

// K_data: random 256-bit key for AES-256
export function generateKData(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(32));
}
