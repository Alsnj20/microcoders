import { Hono } from "hono";
import type { CreditManagerContract } from "../types/contracts.js";
import type { AppEnv } from "../index.js";

const AI_FEES = [
  { provider: "openai", model: "gpt-4o", costInMC: 2, label: "GPT-4o" },
  { provider: "openai", model: "gpt-4o-mini", costInMC: 1, label: "GPT-4o Mini" },
  { provider: "anthropic", model: "claude-sonnet-4-20250514", costInMC: 3, label: "Claude Sonnet" },
  { provider: "anthropic", model: "claude-haiku", costInMC: 1, label: "Claude Haiku" },
  { provider: "google", model: "gemini-2.0-flash", costInMC: 1, label: "Gemini Flash" },
  { provider: "google", model: "gemini-2.5-pro", costInMC: 2, label: "Gemini Pro" },
];

function requireSession(c: { get: (key: string) => unknown; json: (body: unknown, status?: number) => Response }) {
  const session = c.get("session");
  if (!session) return null;
  return session as { address: string; chainId: number; username: string | null };
}

export function createCreditRoutes(creditManager: CreditManagerContract): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get("/balance", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const result = await creditManager.balanceOf(session.address);
    if (!result.success || !result.data) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error ?? "Failed to read balance" }, 500);
    }

    return c.json(result.data);
  });

  routes.get("/fees", async (c) => {
    const result = await creditManager.getFees();
    if (!result.success || !result.data) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error ?? "Failed to read fees" }, 500);
    }

    return c.json(result.data);
  });

  routes.get("/pricing", async (c) => {
    const result = await creditManager.getPricing();
    if (!result.success || !result.data) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error ?? "Failed to read pricing" }, 500);
    }

    return c.json(result.data);
  });

  routes.get("/ai-fees", (c) => {
    return c.json({ fees: AI_FEES });
  });

  return routes;
}
