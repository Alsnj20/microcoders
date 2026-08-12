import { arrayBufferToBase64, base64ToArrayBuffer } from "./utils";

const KWALLET_PREFIX = "mc_kwallet_";
const KRECOVERY_PREFIX = "mc_krecovery_";

export function persistKWallet(address: string, kWallet: Uint8Array): void {
  localStorage.setItem(KWALLET_PREFIX + address.toLowerCase(), arrayBufferToBase64(kWallet));
}

export function loadKWallet(address: string): Uint8Array | null {
  const raw = localStorage.getItem(KWALLET_PREFIX + address.toLowerCase());
  if (!raw) return null;
  try {
    return base64ToArrayBuffer(raw);
  } catch {
    return null;
  }
}

export function clearKWallet(address: string): void {
  localStorage.removeItem(KWALLET_PREFIX + address.toLowerCase());
}

export function persistKRecovery(address: string, kRecovery: Uint8Array): void {
  localStorage.setItem(KRECOVERY_PREFIX + address.toLowerCase(), arrayBufferToBase64(kRecovery));
}

export function loadKRecovery(address: string): Uint8Array | null {
  const raw = localStorage.getItem(KRECOVERY_PREFIX + address.toLowerCase());
  if (!raw) return null;
  try {
    return base64ToArrayBuffer(raw);
  } catch {
    return null;
  }
}

export function clearKRecovery(address: string): void {
  localStorage.removeItem(KRECOVERY_PREFIX + address.toLowerCase());
}
