import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../index.js";
import type { AgentRegistryContract, AgentData } from "../types/contracts.js";

function createMockAgentRegistry(): AgentRegistryContract & {
  _agents: Map<string, AgentData>;
  _nextId: number;
} {
  const agents = new Map<string, AgentData>();
  return {
    _agents: agents,
    _nextId: 1,

    async createAgent(owner, name, description, cid, hash) {
      const id = `agent-${String(this._nextId++).padStart(3, "0")}`;
      const now = Math.floor(Date.now() / 1000);
      const agent: AgentData = {
        agentId: id,
        owner,
        name,
        description,
        cid,
        hash,
        status: 0,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      this._agents.set(id, agent);
      return { success: true, data: id };
    },

    async updateAgent(owner, agentId, cid, hash) {
      const agent = this._agents.get(agentId);
      if (!agent) return { success: false, error: "NOT_FOUND" };
      if (agent.owner !== owner) return { success: false, error: "NOT_OWNER" };
      agent.cid = cid;
      agent.hash = hash;
      agent.version += 1;
      agent.updatedAt = Math.floor(Date.now() / 1000);
      return { success: true };
    },

    async archiveAgent(owner, agentId) {
      const agent = this._agents.get(agentId);
      if (!agent) return { success: false, error: "NOT_FOUND" };
      if (agent.owner !== owner) return { success: false, error: "NOT_OWNER" };
      agent.status = 1;
      return { success: true };
    },

    async restoreAgent(owner, agentId) {
      const agent = this._agents.get(agentId);
      if (!agent) return { success: false, error: "NOT_FOUND" };
      if (agent.owner !== owner) return { success: false, error: "NOT_OWNER" };
      agent.status = 0;
      return { success: true };
    },

    async getAgent(agentId) {
      const agent = this._agents.get(agentId);
      if (!agent) return { success: false, error: "NOT_FOUND" };
      return { success: true, data: agent };
    },

    async getAgentVersion(agentId, version) {
      const agent = this._agents.get(agentId);
      if (!agent) return { success: false, error: "NOT_FOUND" };
      if (version !== agent.version) return { success: false, error: "VERSION_NOT_FOUND" };
      return {
        success: true,
        data: { version, cid: agent.cid, hash: agent.hash, createdAt: agent.createdAt },
      };
    },

    async getAgentCountByOwner(owner) {
      let count = 0;
      for (const agent of this._agents.values()) {
        if (agent.owner === owner) count++;
      }
      return { success: true, data: count };
    },

    async getAgentsByOwner(owner, offset, limit) {
      const all = Array.from(this._agents.values()).filter((a) => a.owner === owner);
      return { success: true, data: all.slice(offset, offset + limit) };
    },
  };
}

describe("Agent CRUD routes", () => {
  let mockRegistry: ReturnType<typeof createMockAgentRegistry>;
  let app: ReturnType<typeof createApp>;

  const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

  beforeEach(() => {
    mockRegistry = createMockAgentRegistry();
    app = createApp({
      session: { address: TEST_ADDRESS, chainId: 412346, username: "testuser" },
      agentRegistry: mockRegistry,
    });
  });

  describe("POST /agents/create", () => {
    it("creates an agent and returns its ID", async () => {
      const res = await app.request("/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Research Bot",
          description: "Searches the web for info",
          cid: "QmAgent123",
          hash: "a".repeat(64),
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agentId).toBeTruthy();
      expect(body.name).toBe("Research Bot");
      expect(body.cid).toBe("QmAgent123");
      expect(body.version).toBe(1);
    });

    it("returns 401 when not authenticated", async () => {
      const unauthedApp = createApp({ agentRegistry: mockRegistry });
      const res = await unauthedApp.request("/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Unauthorized Bot",
          description: "Should fail",
          cid: "QmFail",
          hash: "a".repeat(64),
        }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 400 for missing required fields", async () => {
      const res = await app.request("/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Incomplete" }),
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("GET /agents", () => {
    it("lists agents for the authenticated user", async () => {
      await app.request("/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Bot 1", description: "First", cid: "Qm1", hash: "a".repeat(64) }),
      });
      await app.request("/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Bot 2", description: "Second", cid: "Qm2", hash: "b".repeat(64) }),
      });

      const res = await app.request("/agents");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agents).toHaveLength(2);
      expect(body.total).toBe(2);
    });

    it("returns empty list when user has no agents", async () => {
      const res = await app.request("/agents");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agents).toHaveLength(0);
      expect(body.total).toBe(0);
    });
  });

  describe("GET /agents/:id", () => {
    it("returns agent by ID", async () => {
      const createRes = await app.request("/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Lookup Bot", description: "Find me", cid: "QmLookup", hash: "c".repeat(64) }),
      });
      const { agentId } = await createRes.json();

      const res = await app.request(`/agents/${agentId}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.agentId).toBe(agentId);
      expect(body.name).toBe("Lookup Bot");
      expect(body.description).toBe("Find me");
      expect(body.cid).toBe("QmLookup");
    });

    it("returns 404 for non-existent agent", async () => {
      const res = await app.request("/agents/non-existent");

      expect(res.status).toBe(404);
    });
  });

  describe("PUT /agents/:id", () => {
    it("updates agent CID and increments version", async () => {
      const createRes = await app.request("/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Update Bot", description: "Will change", cid: "QmOld", hash: "d".repeat(64) }),
      });
      const { agentId } = await createRes.json();

      const res = await app.request(`/agents/${agentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid: "QmNew", hash: "e".repeat(64) }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.cid).toBe("QmNew");
      expect(body.version).toBe(2);
    });

    it("returns 404 for non-existent agent", async () => {
      const res = await app.request("/agents/fake-id", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid: "QmNew", hash: "e".repeat(64) }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("POST /agents/:id/archive", () => {
    it("archives an agent", async () => {
      const createRes = await app.request("/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Archive Bot", description: "Will be archived", cid: "QmArch", hash: "f".repeat(64) }),
      });
      const { agentId } = await createRes.json();

      const res = await app.request(`/agents/${agentId}/archive`, { method: "POST" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe(1);
    });
  });

  describe("POST /agents/:id/restore", () => {
    it("restores an archived agent", async () => {
      const createRes = await app.request("/agents/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Restore Bot", description: "Will be restored", cid: "QmRest", hash: "a1".repeat(32) }),
      });
      const { agentId } = await createRes.json();

      await app.request(`/agents/${agentId}/archive`, { method: "POST" });
      const res = await app.request(`/agents/${agentId}/restore`, { method: "POST" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe(0);
    });
  });
});
