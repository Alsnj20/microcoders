import { Hono } from "hono";
import { z } from "zod";
import type { ChatRegistryContract } from "../types/contracts.js";
import type { AppEnv } from "../index.js";

const CreateChatSchema = z.object({
  name: z.string().min(1),
  agentId: z.string().min(1),
  cid: z.string().min(1),
  hash: z.string().length(64),
});

const UpdateChatSchema = z.object({
  cid: z.string().min(1),
  hash: z.string().length(64),
});

function requireSession(c: { get: (key: string) => unknown; json: (body: unknown, status?: number) => Response }) {
  const session = c.get("session");
  if (!session) return null;
  return session as { address: string; chainId: number; username: string | null };
}

export function createChatRoutes(chatRegistry: ChatRegistryContract): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.post("/create", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = CreateChatSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const result = await chatRegistry.createChat(
      session.address,
      parsed.data.name,
      parsed.data.agentId,
      parsed.data.cid,
      parsed.data.hash,
    );

    if (!result.success) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error }, 500);
    }

    const chat = await chatRegistry.getChat(result.data!);
    if (!chat.success || !chat.data) {
      return c.json({ code: "CONTRACT_ERROR", message: "Failed to read created chat" }, 500);
    }

    return c.json({
      chatId: chat.data.chatId,
      name: chat.data.name,
      agentId: chat.data.agentId,
      cid: chat.data.cid,
      hash: chat.data.hash,
      version: chat.data.version,
      createdAt: chat.data.createdAt,
    });
  });

  routes.get("/", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const countResult = await chatRegistry.getChatCountByOwner(session.address);
    if (!countResult.success) {
      return c.json({ code: "CONTRACT_ERROR", message: countResult.error }, 500);
    }

    const total = countResult.data ?? 0;
    const chatsResult = await chatRegistry.getChatsByOwner(session.address, 0, total);
    if (!chatsResult.success) {
      return c.json({ code: "CONTRACT_ERROR", message: chatsResult.error }, 500);
    }

    return c.json({
      chats: chatsResult.data ?? [],
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

    const chatId = c.req.param("id");
    const result = await chatRegistry.getChat(chatId);

    if (!result.success || !result.data) {
      return c.json({ code: "NOT_FOUND", message: "Chat not found" }, 404);
    }

    return c.json(result.data);
  });

  routes.put("/:id", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const chatId = c.req.param("id");
    const body = await c.req.json();
    const parsed = UpdateChatSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const updateResult = await chatRegistry.updateChat(
      session.address,
      chatId,
      parsed.data.cid,
      parsed.data.hash,
    );

    if (!updateResult.success) {
      const status = updateResult.error === "NOT_FOUND" ? 404 : 500;
      return c.json({ code: updateResult.error ?? "CONTRACT_ERROR", message: updateResult.error }, status);
    }

    const chat = await chatRegistry.getChat(chatId);
    if (!chat.success || !chat.data) {
      return c.json({ code: "CONTRACT_ERROR", message: "Failed to read updated chat" }, 500);
    }

    return c.json(chat.data);
  });

  routes.post("/:id/archive", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const chatId = c.req.param("id");
    const result = await chatRegistry.archiveChat(session.address, chatId);

    if (!result.success) {
      const status = result.error === "NOT_FOUND" ? 404 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    const chat = await chatRegistry.getChat(chatId);
    return c.json({ chatId, status: chat.data?.status ?? 1 });
  });

  routes.post("/:id/restore", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const chatId = c.req.param("id");
    const result = await chatRegistry.restoreChat(session.address, chatId);

    if (!result.success) {
      const status = result.error === "NOT_FOUND" ? 404 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    const chat = await chatRegistry.getChat(chatId);
    return c.json({ chatId, status: chat.data?.status ?? 0 });
  });

  return routes;
}
