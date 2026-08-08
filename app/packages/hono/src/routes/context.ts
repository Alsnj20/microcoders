import { Hono } from "hono";
import { z } from "zod";
import type { ContextRegistryContract } from "../types/contracts.js";
import type { AppEnv } from "../index.js";

const LinkMemorySchema = z.object({
  agentId: z.string().min(1),
  memoryId: z.string().min(1),
  priority: z.number().int().min(0).max(255),
});

const UnlinkMemorySchema = z.object({
  agentId: z.string().min(1),
  memoryId: z.string().min(1),
});

const ChangePrioritySchema = z.object({
  priority: z.number().int().min(0).max(255),
});

function requireSession(c: { get: (key: string) => unknown; json: (body: unknown, status?: number) => Response }) {
  const session = c.get("session");
  if (!session) return null;
  return session as { address: string; chainId: number; username: string | null };
}

export function createContextRoutes(contextRegistry: ContextRegistryContract): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.post("/link", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = LinkMemorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const result = await contextRegistry.linkMemory(
      session.address,
      parsed.data.agentId,
      parsed.data.memoryId,
      parsed.data.priority,
    );

    if (!result.success) {
      const status = result.error === "ALREADY_LINKED" ? 409 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    const context = await contextRegistry.getContext(result.data!);
    if (!context.success || !context.data) {
      return c.json({ code: "CONTRACT_ERROR", message: "Failed to read created link" }, 500);
    }

    return c.json(context.data);
  });

  routes.delete("/unlink", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = UnlinkMemorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const result = await contextRegistry.unlinkMemory(
      session.address,
      parsed.data.agentId,
      parsed.data.memoryId,
    );

    if (!result.success) {
      const status = result.error === "LINK_NOT_FOUND" ? 404 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    return c.json({ success: true, agentId: parsed.data.agentId, memoryId: parsed.data.memoryId });
  });

  routes.put("/:contextId/priority", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const contextId = c.req.param("contextId");
    const body = await c.req.json();
    const parsed = ChangePrioritySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const result = await contextRegistry.changePriority(session.address, contextId, parsed.data.priority);
    if (!result.success) {
      const status = result.error === "LINK_NOT_FOUND" ? 404 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    const context = await contextRegistry.getContext(contextId);
    return c.json({ contextId, priority: context.data?.priority ?? parsed.data.priority });
  });

  routes.post("/:contextId/disable", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const contextId = c.req.param("contextId");
    const result = await contextRegistry.disableLink(session.address, contextId);

    if (!result.success) {
      const status = result.error === "LINK_NOT_FOUND" ? 404 : result.error === "ALREADY_DISABLED" ? 409 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    return c.json({ contextId, enabled: false });
  });

  routes.post("/:contextId/enable", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const contextId = c.req.param("contextId");
    const result = await contextRegistry.enableLink(session.address, contextId);

    if (!result.success) {
      const status = result.error === "LINK_NOT_FOUND" ? 404 : result.error === "ALREADY_ENABLED" ? 409 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    return c.json({ contextId, enabled: true });
  });

  routes.get("/agent/:agentId/memories", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const agentId = c.req.param("agentId");
    const countResult = await contextRegistry.getAgentContextCount(agentId);
    if (!countResult.success) {
      return c.json({ code: "CONTRACT_ERROR", message: countResult.error }, 500);
    }

    const total = countResult.data ?? 0;
    const contextsResult = await contextRegistry.getAgentContexts(agentId, 0, total);
    if (!contextsResult.success) {
      return c.json({ code: "CONTRACT_ERROR", message: contextsResult.error }, 500);
    }

    return c.json({
      links: contextsResult.data ?? [],
      total,
    });
  });

  return routes;
}
