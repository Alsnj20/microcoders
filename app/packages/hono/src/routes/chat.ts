import { createOpenAI } from "@ai-sdk/openai";
import { generateText, type ModelMessage } from "ai";
import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../index.js";

const FOUNDRY_OPENAI_URL = process.env.FOUNDRY_OPENAI_URL || "";
const FOUNDRY_KEY = process.env.FOUNDRY_KEY || "";

const foundry = createOpenAI({
  baseURL: FOUNDRY_OPENAI_URL,
  apiKey: FOUNDRY_KEY,
  headers: {
    "api-key": FOUNDRY_KEY,
  },
});

function requireSession(c: { get: (key: string) => unknown; json: (body: unknown, status?: number) => Response }) {
  const session = c.get("session");
  if (!session) return null;
  return session as { address: string; chainId: number; username: string | null };
}

function generateId(): string {
  return "0x" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
}

export function createChatRoutes(chatRegistry: any): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  const CreateChatSchema = z.object({
    name: z.string().min(1).max(100),
  });

  const UpdateChatSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    cid: z.string().min(1).optional(),
    hash: z.string().optional(),
  });

  const ChatMessageSchema = z.object({
    message: z.string().min(1),
    agentId: z.string().optional(),
    chatId: z.string().optional(),
    model: z.string().optional(),
    systemPrompt: z.string().optional(),
    memories: z
      .array(z.object({ title: z.string().optional(), content: z.string().min(1) }))
      .optional(),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().min(1),
        }),
      )
      .optional(),
  });

  // ── CREATE CHAT ────────────────────────────────────────────────────────
  routes.post("/create", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = CreateChatSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ code: "VALIDATION_ERROR", message: "Invalid request" }, 400);
    }

    const { name } = parsed.data;
    const initialCid = `chat-init-${Date.now()}`;
    const initialHash = generateId();

    const result = await chatRegistry.createChat(session.address, name, initialCid, initialHash);
    if (!result.success) {
      return c.json({ code: "CREATE_FAILED", message: result.error || "Failed to create chat" }, 500);
    }

    return c.json({ chatId: result.data, name });
  });

  // ── UPDATE CHAT ────────────────────────────────────────────────────────
  routes.put("/:id", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const chatId = c.req.param("id");
    const body = await c.req.json();
    const parsed = UpdateChatSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ code: "VALIDATION_ERROR", message: "Invalid request" }, 400);
    }

    const { name, cid, hash } = parsed.data;

    // Get current chat data
    const current = await chatRegistry.getChat(chatId);
    if (!current.success || !current.data) {
      return c.json({ code: "NOT_FOUND", message: "Chat not found" }, 404);
    }

    if (current.data.owner.toLowerCase() !== session.address.toLowerCase()) {
      return c.json({ code: "FORBIDDEN", message: "Not your chat" }, 403);
    }

    const result = await chatRegistry.updateChat(
      session.address,
      chatId,
      cid || current.data.cid,
      hash || current.data.hash,
      name || current.data.name,
    );

    if (!result.success) {
      return c.json({ code: "UPDATE_FAILED", message: result.error || "Failed to update chat" }, 500);
    }

    return c.json({ success: true });
  });

  // ── LIST CHATS ─────────────────────────────────────────────────────────
  routes.get("/list", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const result = await chatRegistry.getChatsByOwner(session.address, 0, 100);
    if (!result.success) {
      return c.json({ code: "LIST_FAILED", message: result.error || "Failed to list chats" }, 500);
    }

    const chats = (result.data || []).map((chat: any) => ({
      chatId: chat.chatId,
      name: chat.name,
      cid: chat.cid,
      hash: chat.hash,
      version: chat.version,
      status: chat.status,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
    }));

    return c.json({ chats });
  });

  // ── WELCOME MESSAGE ─────────────────────────────────────────────────
  routes.get("/welcome", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const username = c.req.query("username") || session.username || "usuario";
    const shortAddress = session.address
      ? `${session.address.slice(0, 6)}…${session.address.slice(-4)}`
      : "";
    const welcomeMessage = `¡Hola ${username}! 👋 Soy tu asistente de MemoryChain.

Puedo ayudarte a:
• **Crear memorias** — Guarda información importante en la blockchain
• **Crear agentes** — Configura agentes de IA especializados
• **Vincular memorias a agentes** — Dale conocimiento a tus agentes
• **Consultar tu knowledge base** — Recupera información guardada

¿En qué te puedo ayudar hoy?`;

    return c.json({ message: welcomeMessage, address: shortAddress, username });
  });

  // ── GET CHAT ───────────────────────────────────────────────────────────
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

  // ── ARCHIVE CHAT ───────────────────────────────────────────────────────
  routes.delete("/:id", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const chatId = c.req.param("id");
    const result = await chatRegistry.archiveChat(session.address, chatId);
    if (!result.success) {
      return c.json({ code: "ARCHIVE_FAILED", message: result.error || "Failed to archive chat" }, 500);
    }

    return c.json({ success: true });
  });

  // ── SEND MESSAGE ───────────────────────────────────────────────────────
  routes.post("/send", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = ChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ code: "VALIDATION_ERROR", message: "Invalid request" }, 400);
    }

    const { message, model, systemPrompt, memories = [], history = [] } = parsed.data;

    try {
      if (!FOUNDRY_OPENAI_URL || !FOUNDRY_KEY) {
        return c.json({ code: "CONFIG_ERROR", message: "AI provider not configured" }, 500);
      }

      const modelId = model || "gpt-5-nano";
      const system = systemPrompt?.trim() || "Eres un asistente útil. Responde en español.";

      // Linked memories are injected as a leading context message so the model
      // sees them as persistent info about the user, without touching the system prompt.
      const messages: ModelMessage[] = [];
      if (memories.length > 0) {
        const memoryBlock = memories
          .map((m) => `- ${m.title || "Sin título"}: ${m.content}`)
          .join("\n");
        messages.push({
          role: "system",
          content: `Información persistente sobre el usuario:\n${memoryBlock}`,
        });
      }
      for (const h of history) {
        messages.push({ role: h.role, content: h.content });
      }
      messages.push({ role: "user", content: message });

      const result = await generateText({
        model: foundry(modelId),
        system,
        messages,
        allowSystemInMessages: true,
        maxOutputTokens: 2000,
      });

      const reply = result.text || "No pude generar una respuesta.";

      // Calculate dynamic credit cost based on usage
      const inputTokens = result.usage?.inputTokens || 0;
      const outputTokens = result.usage?.outputTokens || 0;
      // Simple heuristic: ~$0.001 per 1K tokens input, ~$0.002 per 1K tokens output
      // Convert to credits: 1 credit = $0.00001 (based on existing pricing)
      const estimatedCostMicroUSD = (inputTokens * 0.001 + outputTokens * 0.002) / 1000;
      const creditsUsed = Math.max(1, Math.ceil(estimatedCostMicroUSD / 0.00001));

      return c.json({
        reply,
        model: modelId,
        usage: {
          prompt_tokens: inputTokens,
          completion_tokens: outputTokens,
          total_tokens: result.usage?.totalTokens || 0,
        },
        creditsUsed,
      });
    } catch (err: any) {
      console.error("Chat error:", err.message);
      return c.json({ code: "AI_ERROR", message: "Error al procesar el mensaje" }, 500);
    }
  });

  return routes;
}
