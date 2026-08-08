import { Hono } from "hono";
import type { AuditRegistryContract } from "../types/contracts.js";
import type { AppEnv } from "../index.js";

function requireSession(c: { get: (key: string) => unknown; json: (body: unknown, status?: number) => Response }) {
  const session = c.get("session");
  if (!session) return null;
  return session as { address: string; chainId: number; username: string | null };
}

export function createAuditRoutes(auditRegistry: AuditRegistryContract): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get("/events", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const totalResult = await auditRegistry.getTotalEvents();
    if (!totalResult.success) {
      return c.json({ code: "CONTRACT_ERROR", message: totalResult.error }, 500);
    }

    return c.json({ total: totalResult.data ?? 0 });
  });

  routes.get("/event/:eventId", async (c) => {
    const eventId = c.req.param("eventId");
    const result = await auditRegistry.getAuditEvent(eventId);

    if (!result.success || !result.data) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error ?? "Event not found" }, 404);
    }

    return c.json(result.data);
  });

  return routes;
}
