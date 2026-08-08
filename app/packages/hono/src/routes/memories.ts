import { Hono } from "hono";
import { z } from "zod";
import type { MemoryRegistryContract } from "../types/contracts.js";
import type { AppEnv } from "../index.js";

const CreateMemorySchema = z.object({
  name: z.string().min(1),
  cid: z.string().min(1),
  hash: z.string().refine((v) => v.replace("0x", "").length === 64, "hash must be 64 hex chars"),
  memoryType: z.number().int().min(0).max(4),
  visibility: z.number().int().min(0).max(2),
});

const UpdateMemorySchema = z.object({
  cid: z.string().min(1),
  hash: z.string().refine((v) => v.replace("0x", "").length === 64, "hash must be 64 hex chars"),
});

function requireSession(c: { get: (key: string) => unknown; json: (body: unknown, status?: number) => Response }) {
  const session = c.get("session");
  if (!session) {
    return null;
  }
  return session as { address: string; chainId: number; username: string | null };
}

export function createMemoryRoutes(memoryRegistry: MemoryRegistryContract): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.post("/create", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = CreateMemorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const result = await memoryRegistry.createMemory(
      session.address,
      parsed.data.name,
      parsed.data.cid,
      parsed.data.hash,
      parsed.data.memoryType,
      parsed.data.visibility,
    );

    if (!result.success) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error }, 500);
    }

    const memory = await memoryRegistry.getMemory(result.data!);
    if (!memory.success || !memory.data) {
      return c.json({ code: "CONTRACT_ERROR", message: "Failed to read created memory" }, 500);
    }

    return c.json({
      memoryId: memory.data.memoryId,
      name: parsed.data.name,
      cid: memory.data.cid,
      hash: memory.data.hash,
      version: memory.data.version,
      memoryType: memory.data.memoryType,
      visibility: memory.data.visibility,
      createdAt: memory.data.createdAt,
    });
  });

  routes.get("/", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const countResult = await memoryRegistry.getMemoryCountByOwner(session.address);
    if (!countResult.success) {
      return c.json({ code: "CONTRACT_ERROR", message: countResult.error }, 500);
    }

    const total = countResult.data ?? 0;
    const memoriesResult = await memoryRegistry.getMemoriesByOwner(session.address, 0, total);
    if (!memoriesResult.success) {
      return c.json({ code: "CONTRACT_ERROR", message: memoriesResult.error }, 500);
    }

    return c.json({
      memories: memoriesResult.data ?? [],
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

    const memoryId = c.req.param("id");
    const result = await memoryRegistry.getMemory(memoryId);

    if (!result.success || !result.data) {
      return c.json({ code: "NOT_FOUND", message: "Memory not found" }, 404);
    }

    return c.json(result.data);
  });

  routes.put("/:id", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const memoryId = c.req.param("id");
    const body = await c.req.json();
    const parsed = UpdateMemorySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const updateResult = await memoryRegistry.updateMemory(
      session.address,
      memoryId,
      parsed.data.cid,
      parsed.data.hash,
    );

    if (!updateResult.success) {
      const status = updateResult.error === "NOT_FOUND" ? 404 : 500;
      return c.json({ code: updateResult.error ?? "CONTRACT_ERROR", message: updateResult.error }, status);
    }

    const memory = await memoryRegistry.getMemory(memoryId);
    if (!memory.success || !memory.data) {
      return c.json({ code: "CONTRACT_ERROR", message: "Failed to read updated memory" }, 500);
    }

    return c.json(memory.data);
  });

  routes.post("/:id/archive", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const memoryId = c.req.param("id");
    const result = await memoryRegistry.archiveMemory(session.address, memoryId);

    if (!result.success) {
      const status = result.error === "NOT_FOUND" ? 404 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    const memory = await memoryRegistry.getMemory(memoryId);
    return c.json({ memoryId, status: memory.data?.status ?? 1 });
  });

  routes.post("/:id/restore", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const memoryId = c.req.param("id");
    const result = await memoryRegistry.restoreMemory(session.address, memoryId);

    if (!result.success) {
      const status = result.error === "NOT_FOUND" ? 404 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    const memory = await memoryRegistry.getMemory(memoryId);
    return c.json({ memoryId, status: memory.data?.status ?? 0 });
  });

  return routes;
}
