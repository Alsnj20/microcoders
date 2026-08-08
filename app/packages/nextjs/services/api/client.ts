import { hc } from "hono/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

let currentWalletAddress: string | null = null;

export function setWalletAddress(address: string | null) {
  currentWalletAddress = address;
}

export const api = hc<any>(API_URL, {
  headers: {
    "Content-Type": "application/json",
  },
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    if (currentWalletAddress) {
      headers.set("X-Dev-Wallet", currentWalletAddress);
    }
    return fetch(input, {
      ...init,
      headers,
      credentials: "include",
    });
  },
}) as any;
