import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../index.js";
import type { ContextRegistryContract, ContextData } from "../types/contracts.js";

function createMockContextRegistry(): ContextRegistryContract & {
  _contexts: Map<string, ContextData>;
  _nextId: number;
} {
  const contexts = new Map<string, ContextData>();
  return {
    _contexts: contexts,
    _nextId: 1,

    async linkMemory(_owner, agentId, memoryId, priority) {
      // Check for duplicate
      for (const ctx of this._contexts.values()) {
        if (ctx.agentId === agentId && ctx.memoryId === memoryId) {
          return { success: false, error: "ALREADY_LINKED" };
        }
      }
      const id = `ctx-${String(this._nextId++).padStart(3, "0")}`;
      const context: ContextData = {
        contextId: id,
        agentId,
        memoryId,
        priority,
        enabled: true,
        createdAt: Math.floor(Date.now() / 1000),
      };
      this._contexts.set(id, context);
      return { success: true, data: id };
    },

    async unlinkMemory(_owner, agentId, memoryId) {
      for (const [id, ctx] of this._contexts.entries()) {
        if (ctx.agentId === agentId && ctx.memoryId === memoryId) {
          this._contexts.delete(id);
          return { success: true };
        }
      }
      return { success: false, error: "LINK_NOT_FOUND" };
    },

    async changePriority(_owner, contextId, newPriority) {
      const ctx = this._contexts.get(contextId);
      if (!ctx) return { success: false, error: "LINK_NOT_FOUND" };
      ctx.priority = newPriority;
      return { success: true };
    },

    async disableLink(_owner, contextId) {
      const ctx = this._contexts.get(contextId);
      if (!ctx) return { success: false, error: "LINK_NOT_FOUND" };
      if (!ctx.enabled) return { success: false, error: "ALREADY_DISABLED" };
      ctx.enabled = false;
      return { success: true };
    },

    async enableLink(_owner, contextId) {
      const ctx = this._contexts.get(contextId);
      if (!ctx) return { success: false, error: "LINK_NOT_FOUND" };
      if (ctx.enabled) return { success: false, error: "ALREADY_ENABLED" };
      ctx.enabled = true;
      return { success: true };
    },

    async getContext(contextId) {
      const ctx = this._contexts.get(contextId);
      if (!ctx) return { success: false, error: "LINK_NOT_FOUND" };
      return { success: true, data: ctx };
    },

    async getAgentContextCount(agentId) {
      let count = 0;
      for (const ctx of this._contexts.values()) {
        if (ctx.agentId === agentId) count++;
      }
      return { success: true, data: count };
    },

    async getAgentContexts(agentId, offset, limit) {
      const all = Array.from(this._contexts.values()).filter((c) => c.agentId === agentId);
      return { success: true, data: all.slice(offset, offset + limit) };
    },
  };
}

describe("Context/linking routes", () => {
  let mockContext: ReturnType<typeof createMockContextRegistry>;
  let app: ReturnType<typeof createApp>;

  const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

  beforeEach(() => {
    mockContext = createMockContextRegistry();
    app = createApp({
      session: { address: TEST_ADDRESS, chainId: 412346, username: "testuser" },
      contextRegistry: mockContext,
    });
  });

  describe("POST /context/link", () => {
    it("links a memory to an agent", async () => {
      const res = await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "agent-001",
          memoryId: "mem-001",
          priority: 10,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.contextId).toBeTruthy();
      expect(body.agentId).toBe("agent-001");
      expect(body.memoryId).toBe("mem-001");
      expect(body.priority).toBe(10);
      expect(body.enabled).toBe(true);
    });

    it("returns 409 when link already exists", async () => {
      await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m1", priority: 0 }),
      });

      const res = await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m1", priority: 0 }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe("ALREADY_LINKED");
    });

    it("returns 401 when not authenticated", async () => {
      const unauthedApp = createApp({ contextRegistry: mockContext });
      const res = await unauthedApp.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m1", priority: 0 }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 400 for missing fields", async () => {
      const res = await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1" }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("DELETE /context/unlink", () => {
    it("unlinks a memory from an agent", async () => {
      await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m1", priority: 0 }),
      });

      const res = await app.request("/context/unlink", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m1" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });

    it("returns 404 when link does not exist", async () => {
      const res = await app.request("/context/unlink", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "nonexistent" }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /context/:contextId/priority", () => {
    it("changes priority of a link", async () => {
      const linkRes = await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m1", priority: 5 }),
      });
      const { contextId } = await linkRes.json();

      const res = await app.request(`/context/${contextId}/priority`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: 20 }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.priority).toBe(20);
    });

    it("returns 404 for non-existent link", async () => {
      const res = await app.request("/context/fake-id/priority", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: 10 }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /context/:contextId/disable", () => {
    it("disables a link", async () => {
      const linkRes = await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m1", priority: 0 }),
      });
      const { contextId } = await linkRes.json();

      const res = await app.request(`/context/${contextId}/disable`, { method: "POST" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.enabled).toBe(false);
    });

    it("returns 409 when already disabled", async () => {
      const linkRes = await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m1", priority: 0 }),
      });
      const { contextId } = await linkRes.json();

      await app.request(`/context/${contextId}/disable`, { method: "POST" });
      const res = await app.request(`/context/${contextId}/disable`, { method: "POST" });

      expect(res.status).toBe(409);
    });
  });

  describe("POST /context/:contextId/enable", () => {
    it("enables a disabled link", async () => {
      const linkRes = await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m1", priority: 0 }),
      });
      const { contextId } = await linkRes.json();

      await app.request(`/context/${contextId}/disable`, { method: "POST" });
      const res = await app.request(`/context/${contextId}/enable`, { method: "POST" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.enabled).toBe(true);
    });

    it("returns 409 when already enabled", async () => {
      const linkRes = await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m1", priority: 0 }),
      });
      const { contextId } = await linkRes.json();

      const res = await app.request(`/context/${contextId}/enable`, { method: "POST" });

      expect(res.status).toBe(409);
    });
  });

  describe("GET /context/agent/:agentId/memories", () => {
    it("lists all linked memories for an agent", async () => {
      await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m1", priority: 5 }),
      });
      await app.request("/context/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "a1", memoryId: "m2", priority: 10 }),
      });

      const res = await app.request("/context/agent/a1/memories");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.links).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it("returns empty list when agent has no links", async () => {
      const res = await app.request("/context/agent/empty-agent/memories");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.links).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });
});
