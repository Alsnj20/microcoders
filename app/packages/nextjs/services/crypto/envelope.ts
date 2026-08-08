import { arrayBufferToBase64, base64ToArrayBuffer, concat } from "./utils";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Encrypt data with K_data using AES-GCM
export async function encryptData(data: string, kData: Uint8Array): Promise<Uint8Array> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await window.crypto.subtle.importKey("raw", kData as BufferSource, "AES-GCM", false, ["encrypt"]);
  const encrypted = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(data));
  return concat(iv, new Uint8Array(encrypted));
}

// Decrypt data with K_data using AES-GCM
export async function decryptData(ciphertext: Uint8Array, kData: Uint8Array): Promise<string> {
  const iv = ciphertext.slice(0, 12);
  const data = ciphertext.slice(12);
  const key = await window.crypto.subtle.importKey("raw", kData as BufferSource, "AES-GCM", false, ["decrypt"]);
  const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return decoder.decode(decrypted);
}

// Create wallet envelope: encrypt K_data with K_wallet
export async function createWalletEnvelope(kData: Uint8Array, kWallet: Uint8Array): Promise<Uint8Array> {
  const kDataB64 = arrayBufferToBase64(kData);
  return encryptData(kDataB64, kWallet);
}

// Decrypt wallet envelope: decrypt and retrieve K_data using K_wallet
export async function decryptWalletEnvelope(envelope: Uint8Array, kWallet: Uint8Array): Promise<Uint8Array> {
  const kDataB64 = await decryptData(envelope, kWallet);
  return base64ToArrayBuffer(kDataB64);
}

// Create recovery envelope: encrypt K_data with K_recovery
export async function createRecoveryEnvelope(kData: Uint8Array, kRecovery: Uint8Array): Promise<Uint8Array> {
  const kDataB64 = arrayBufferToBase64(kData);
  return encryptData(kDataB64, kRecovery);
}

// Decrypt recovery envelope: decrypt and retrieve K_data using K_recovery
export async function decryptRecoveryEnvelope(envelope: Uint8Array, kRecovery: Uint8Array): Promise<Uint8Array> {
  const kDataB64 = await decryptData(envelope, kRecovery);
  return base64ToArrayBuffer(kDataB64);
}
