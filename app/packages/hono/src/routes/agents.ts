import { Hono } from "hono";
import { z } from "zod";
import type { AgentRegistryContract } from "../types/contracts.js";
import type { AppEnv } from "../index.js";

const CreateAgentSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  cid: z.string().min(1),
  hash: z.string().refine((v) => v.replace("0x", "").length === 64, "hash must be 64 hex chars"),
});

const UpdateAgentSchema = z.object({
  cid: z.string().min(1),
  hash: z.string().refine((v) => v.replace("0x", "").length === 64, "hash must be 64 hex chars"),
});

function requireSession(c: { get: (key: string) => unknown; json: (body: unknown, status?: number) => Response }) {
  const session = c.get("session");
  if (!session) return null;
  return session as { address: string; chainId: number; username: string | null };
}

export function createAgentRoutes(agentRegistry: AgentRegistryContract): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.post("/create", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = CreateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const result = await agentRegistry.createAgent(
      session.address,
      parsed.data.name,
      parsed.data.description,
      parsed.data.cid,
      parsed.data.hash,
    );

    if (!result.success) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error }, 500);
    }

    const agent = await agentRegistry.getAgent(result.data!);
    if (!agent.success || !agent.data) {
      return c.json({ code: "CONTRACT_ERROR", message: "Failed to read created agent" }, 500);
    }

    return c.json({
      agentId: agent.data.agentId,
      name: agent.data.name,
      description: agent.data.description,
      cid: agent.data.cid,
      hash: agent.data.hash,
      version: agent.data.version,
      createdAt: agent.data.createdAt,
    });
  });

  routes.get("/", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const countResult = await agentRegistry.getAgentCountByOwner(session.address);
    if (!countResult.success) {
      return c.json({ code: "CONTRACT_ERROR", message: countResult.error }, 500);
    }

    const total = countResult.data ?? 0;
    const agentsResult = await agentRegistry.getAgentsByOwner(session.address, 0, total);
    if (!agentsResult.success) {
      return c.json({ code: "CONTRACT_ERROR", message: agentsResult.error }, 500);
    }

    return c.json({
      agents: agentsResult.data ?? [],
      total,
      page: 1,
      limit: total,
    });
  });

  routes.get("/:id", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const agentId = c.req.param("id");
    const result = await agentRegistry.getAgent(agentId);

    if (!result.success || !result.data) {
      return c.json({ code: "NOT_FOUND", message: "Agent not found" }, 404);
    }

    return c.json(result.data);
  });

  routes.put("/:id", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const agentId = c.req.param("id");
    const body = await c.req.json();
    const parsed = UpdateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const updateResult = await agentRegistry.updateAgent(
      session.address,
      agentId,
      parsed.data.cid,
      parsed.data.hash,
    );

    if (!updateResult.success) {
      const status = updateResult.error === "NOT_FOUND" ? 404 : 500;
      return c.json({ code: updateResult.error ?? "CONTRACT_ERROR", message: updateResult.error }, status);
    }

    const agent = await agentRegistry.getAgent(agentId);
    if (!agent.success || !agent.data) {
      return c.json({ code: "CONTRACT_ERROR", message: "Failed to read updated agent" }, 500);
    }

    return c.json(agent.data);
  });

  routes.post("/:id/archive", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const agentId = c.req.param("id");
    const result = await agentRegistry.archiveAgent(session.address, agentId);

    if (!result.success) {
      const status = result.error === "NOT_FOUND" ? 404 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    const agent = await agentRegistry.getAgent(agentId);
    return c.json({ agentId, status: agent.data?.status ?? 1 });
  });

  routes.post("/:id/restore", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const agentId = c.req.param("id");
    const result = await agentRegistry.restoreAgent(session.address, agentId);

    if (!result.success) {
      const status = result.error === "NOT_FOUND" ? 404 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    const agent = await agentRegistry.getAgent(agentId);
    return c.json({ agentId, status: agent.data?.status ?? 0 });
  });

  return routes;
}
