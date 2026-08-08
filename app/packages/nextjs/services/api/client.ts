import { hc } from "hono/client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const DEV_WALLET = "0xDD09b55496EaA3cFAe23137ABDeA52a9a979B70e";

export const api = hc<any>(API_URL, {
  headers: {
    "Content-Type": "application/json",
    ...(window.location.hostname === "localhost" ? { "X-Dev-Wallet": DEV_WALLET } : {}),
  },
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: "include",
    });
  },
}) as any;
