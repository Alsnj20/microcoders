import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../index.js";
import type { MemoryRegistryContract, MemoryData } from "../types/contracts.js";

function createMockMemoryRegistry(): MemoryRegistryContract & {
  _memories: Map<string, MemoryData>;
  _nextId: number;
} {
  const memories = new Map<string, MemoryData>();
  return {
    _memories: memories,
    _nextId: 1,

    async createMemory(owner, name, cid, hash, memoryType, visibility) {
      const id = `mem-${String(this._nextId++).padStart(3, "0")}`;
      const now = Math.floor(Date.now() / 1000);
      const memory: MemoryData = {
        memoryId: id,
        owner,
        name,
        cid,
        hash,
        memoryType,
        visibility,
        status: 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      this._memories.set(id, memory);
      return { success: true, data: id };
    },

    async updateMemory(owner, memoryId, cid, hash) {
      const mem = this._memories.get(memoryId);
      if (!mem) return { success: false, error: "NOT_FOUND" };
      if (mem.owner !== owner) return { success: false, error: "NOT_OWNER" };
      mem.cid = cid;
      mem.hash = hash;
      mem.version += 1;
      mem.updatedAt = Math.floor(Date.now() / 1000);
      return { success: true };
    },

    async archiveMemory(owner, memoryId) {
      const mem = this._memories.get(memoryId);
      if (!mem) return { success: false, error: "NOT_FOUND" };
      if (mem.owner !== owner) return { success: false, error: "NOT_OWNER" };
      mem.status = 1;
      return { success: true };
    },

    async restoreMemory(owner, memoryId) {
      const mem = this._memories.get(memoryId);
      if (!mem) return { success: false, error: "NOT_FOUND" };
      if (mem.owner !== owner) return { success: false, error: "NOT_OWNER" };
      mem.status = 0;
      return { success: true };
    },

    async getMemory(memoryId) {
      const mem = this._memories.get(memoryId);
      if (!mem) return { success: false, error: "NOT_FOUND" };
      return { success: true, data: mem };
    },

    async getMemoryVersion(memoryId, version) {
      const mem = this._memories.get(memoryId);
      if (!mem) return { success: false, error: "NOT_FOUND" };
      if (version !== mem.version) return { success: false, error: "VERSION_NOT_FOUND" };
      return {
        success: true,
        data: { version, cid: mem.cid, hash: mem.hash, createdAt: mem.createdAt },
      };
    },

    async getMemoryCountByOwner(owner) {
      let count = 0;
      for (const mem of this._memories.values()) {
        if (mem.owner === owner) count++;
      }
      return { success: true, data: count };
    },

    async getMemoriesByOwner(owner, offset, limit) {
      const all = Array.from(this._memories.values()).filter((m) => m.owner === owner);
      return { success: true, data: all.slice(offset, offset + limit) };
    },
  };
}

describe("Memory CRUD routes", () => {
  let mockRegistry: ReturnType<typeof createMockMemoryRegistry>;
  let app: ReturnType<typeof createApp>;

  const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

  beforeEach(() => {
    mockRegistry = createMockMemoryRegistry();
    app = createApp({
      session: { address: TEST_ADDRESS, chainId: 412346, username: "testuser" },
      memoryRegistry: mockRegistry,
    });
  });

  describe("POST /memories/create", () => {
    it("creates a memory and returns its ID", async () => {
      const res = await app.request("/memories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "My first memory",
          cid: "QmTest123",
          hash: "a".repeat(64),
          memoryType: 1,
          visibility: 0,
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.memoryId).toBeTruthy();
      expect(body.cid).toBe("QmTest123");
      expect(body.version).toBe(1);
    });

    it("returns 401 when not authenticated", async () => {
      const unauthedApp = createApp({ memoryRegistry: mockRegistry });
      const res = await unauthedApp.request("/memories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Unauthorized",
          cid: "QmTest",
          hash: "a".repeat(64),
          memoryType: 1,
          visibility: 0,
        }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 400 for missing required fields", async () => {
      const res = await app.request("/memories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Incomplete" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /memories", () => {
    it("lists memories for the authenticated user", async () => {
      // Create two memories first
      await app.request("/memories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Mem 1", cid: "Qm1", hash: "a".repeat(64), memoryType: 0, visibility: 0 }),
      });
      await app.request("/memories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Mem 2", cid: "Qm2", hash: "b".repeat(64), memoryType: 1, visibility: 1 }),
      });

      const res = await app.request("/memories");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.memories).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it("returns empty list when user has no memories", async () => {
      const res = await app.request("/memories");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.memories).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  describe("GET /memories/:id", () => {
    it("returns memory by ID", async () => {
      const createRes = await app.request("/memories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Lookup me", cid: "QmLookup", hash: "c".repeat(64), memoryType: 2, visibility: 0 }),
      });
      const { memoryId } = await createRes.json();

      const res = await app.request(`/memories/${memoryId}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.memoryId).toBe(memoryId);
      expect(body.name).toBe("Lookup me");
      expect(body.cid).toBe("QmLookup");
    });

    it("returns 404 for non-existent memory", async () => {
      const res = await app.request("/memories/non-existent");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /memories/:id", () => {
    it("updates memory CID and increments version", async () => {
      const createRes = await app.request("/memories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Update me", cid: "QmOld", hash: "d".repeat(64), memoryType: 0, visibility: 0 }),
      });
      const { memoryId } = await createRes.json();

      const res = await app.request(`/memories/${memoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid: "QmNew", hash: "e".repeat(64) }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.cid).toBe("QmNew");
      expect(body.version).toBe(2);
    });

    it("returns 404 for non-existent memory", async () => {
      const res = await app.request("/memories/fake-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid: "QmNew", hash: "e".repeat(64) }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /memories/:id/archive", () => {
    it("archives a memory", async () => {
      const createRes = await app.request("/memories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Archive me", cid: "QmArch", hash: "f".repeat(64), memoryType: 0, visibility: 0 }),
      });
      const { memoryId } = await createRes.json();

      const res = await app.request(`/memories/${memoryId}/archive`, { method: "POST" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe(1);
    });
  });

  describe("POST /memories/:id/restore", () => {
    it("restores an archived memory", async () => {
      const createRes = await app.request("/memories/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Restore me", cid: "QmRest", hash: "a1".repeat(32), memoryType: 0, visibility: 0 }),
      });
      const { memoryId } = await createRes.json();

      await app.request(`/memories/${memoryId}/archive`, { method: "POST" });
      const res = await app.request(`/memories/${memoryId}/restore`, { method: "POST" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe(0);
    });
  });
});
