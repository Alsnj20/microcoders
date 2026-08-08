import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../index.js";
import type { ChatRegistryContract, ChatData } from "../types/contracts.js";

function createMockChatRegistry(): ChatRegistryContract & {
  _chats: Map<string, ChatData>;
  _nextId: number;
} {
  const chats = new Map<string, ChatData>();
  return {
    _chats: chats,
    _nextId: 1,

    async createChat(owner, name, agentId, cid, hash) {
      const id = `chat-${String(this._nextId++).padStart(3, "0")}`;
      const now = Math.floor(Date.now() / 1000);
      const chat: ChatData = {
        chatId: id,
        owner,
        name,
        agentId,
        cid,
        hash,
        status: 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      this._chats.set(id, chat);
      return { success: true, data: id };
    },

    async updateChat(owner, chatId, cid, hash) {
      const chat = this._chats.get(chatId);
      if (!chat) return { success: false, error: "NOT_FOUND" };
      if (chat.owner !== owner) return { success: false, error: "NOT_OWNER" };
      chat.cid = cid;
      chat.hash = hash;
      chat.version += 1;
      chat.updatedAt = Math.floor(Date.now() / 1000);
      return { success: true };
    },

    async archiveChat(owner, chatId) {
      const chat = this._chats.get(chatId);
      if (!chat) return { success: false, error: "NOT_FOUND" };
      if (chat.owner !== owner) return { success: false, error: "NOT_OWNER" };
      chat.status = 1;
      return { success: true };
    },

    async restoreChat(owner, chatId) {
      const chat = this._chats.get(chatId);
      if (!chat) return { success: false, error: "NOT_FOUND" };
      if (chat.owner !== owner) return { success: false, error: "NOT_OWNER" };
      chat.status = 0;
      return { success: true };
    },

    async getChat(chatId) {
      const chat = this._chats.get(chatId);
      if (!chat) return { success: false, error: "NOT_FOUND" };
      return { success: true, data: chat };
    },

    async getChatCountByOwner(owner) {
      let count = 0;
      for (const chat of this._chats.values()) {
        if (chat.owner === owner) count++;
      }
      return { success: true, data: count };
    },

    async getChatsByOwner(owner, offset, limit) {
      const all = Array.from(this._chats.values()).filter((c) => c.owner === owner);
      return { success: true, data: all.slice(offset, offset + limit) };
    },
  };
}

describe("Chat CRUD routes", () => {
  let mockRegistry: ReturnType<typeof createMockChatRegistry>;
  let app: ReturnType<typeof createApp>;

  const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

  beforeEach(() => {
    mockRegistry = createMockChatRegistry();
    app = createApp({
      session: { address: TEST_ADDRESS, chainId: 412346, username: "testuser" },
      chatRegistry: mockRegistry,
    });
  });

  describe("POST /chats/create", () => {
    it("creates a chat and returns its ID", async () => {
      const res = await app.request("/chats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Research Session",
          agentId: "agent-001",
          cid: "QmChat123",
          hash: "a".repeat(64),
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.chatId).toBeTruthy();
      expect(body.name).toBe("Research Session");
      expect(body.agentId).toBe("agent-001");
      expect(body.version).toBe(1);
    });

    it("returns 401 when not authenticated", async () => {
      const unauthedApp = createApp({ chatRegistry: mockRegistry });
      const res = await unauthedApp.request("/chats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Unauthorized Chat",
          agentId: "a1",
          cid: "QmFail",
          hash: "a".repeat(64),
        }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 400 for missing required fields", async () => {
      const res = await app.request("/chats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Incomplete" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /chats", () => {
    it("lists chats for the authenticated user", async () => {
      await app.request("/chats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Chat 1", agentId: "a1", cid: "Qm1", hash: "a".repeat(64) }),
      });
      await app.request("/chats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Chat 2", agentId: "a2", cid: "Qm2", hash: "b".repeat(64) }),
      });

      const res = await app.request("/chats");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.chats).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it("returns empty list when user has no chats", async () => {
      const res = await app.request("/chats");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.chats).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  describe("GET /chats/:id", () => {
    it("returns chat by ID", async () => {
      const createRes = await app.request("/chats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Lookup Chat", agentId: "a1", cid: "QmLookup", hash: "c".repeat(64) }),
      });
      const { chatId } = await createRes.json();

      const res = await app.request(`/chats/${chatId}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.chatId).toBe(chatId);
      expect(body.name).toBe("Lookup Chat");
      expect(body.agentId).toBe("a1");
    });

    it("returns 404 for non-existent chat", async () => {
      const res = await app.request("/chats/non-existent");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /chats/:id", () => {
    it("updates chat CID and increments version", async () => {
      const createRes = await app.request("/chats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Update Chat", agentId: "a1", cid: "QmOld", hash: "d".repeat(64) }),
      });
      const { chatId } = await createRes.json();

      const res = await app.request(`/chats/${chatId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid: "QmNew", hash: "e".repeat(64) }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.cid).toBe("QmNew");
      expect(body.version).toBe(2);
    });

    it("returns 404 for non-existent chat", async () => {
      const res = await app.request("/chats/fake-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid: "QmNew", hash: "e".repeat(64) }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /chats/:id/archive", () => {
    it("archives a chat", async () => {
      const createRes = await app.request("/chats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Archive Chat", agentId: "a1", cid: "QmArch", hash: "f".repeat(64) }),
      });
      const { chatId } = await createRes.json();

      const res = await app.request(`/chats/${chatId}/archive`, { method: "POST" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe(1);
    });
  });

  describe("POST /chats/:id/restore", () => {
    it("restores an archived chat", async () => {
      const createRes = await app.request("/chats/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Restore Chat", agentId: "a1", cid: "QmRest", hash: "a1".repeat(32) }),
      });
      const { chatId } = await createRes.json();

      await app.request(`/chats/${chatId}/archive`, { method: "POST" });
      const res = await app.request(`/chats/${chatId}/restore`, { method: "POST" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe(0);
    });
  });
});
