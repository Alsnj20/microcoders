import { hc } from "hono/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const devWalletAuth = process.env.NEXT_PUBLIC_ENABLE_DEV_WALLET_AUTH === "true";

let currentWalletAddress: string | null = null;

export function setWalletAddress(address: string | null) {
  console.log("[API] setWalletAddress:", address, "| devWalletAuth:", devWalletAuth);
  currentWalletAddress = address;
}

export const api = hc<any>(API_URL, {
  headers: {
    "Content-Type": "application/json",
  },
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const url = typeof input === "string" ? input : input.toString();

    if (currentWalletAddress && devWalletAuth) {
      headers.set("X-Dev-Wallet", currentWalletAddress);
    }

    const hasCookie = document.cookie.includes("session=");
    console.log(`[API] ${init?.method || "GET"} ${url} | cookie: ${hasCookie} | devHeader: ${headers.has("X-Dev-Wallet")}`);

    return fetch(input, {
      ...init,
      headers,
      credentials: "include",
    });
  },
}) as any;
