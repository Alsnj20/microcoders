import type { createApp } from "../../../hono/src/index";
import { hc } from "hono/client";

type AppType = ReturnType<typeof createApp>;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Create Hono client. Pass credentials: "include" to enable sending cookies for session auth.
export const api = hc<any>(API_URL, {
  headers: {
    "Content-Type": "application/json",
  },
  // Custom fetch function to default credentials to include
  fetch: (input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: "include",
    });
  },
}) as any;
