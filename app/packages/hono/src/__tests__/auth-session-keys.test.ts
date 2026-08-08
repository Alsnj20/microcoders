import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../index.js";
import type { SessionStore, SessionData, SessionKeyStore, SessionKeyData } from "../types/session.js";

function createMockSessionStore(): SessionStore & {
  _sessions: Map<string, SessionData>;
} {
  const sessions = new Map<string, SessionData>();

  return {
    _sessions: sessions,

    async get(sessionId) {
      return sessions.get(sessionId) ?? null;
    },

    async set(sessionId, data) {
      sessions.set(sessionId, data);
    },

    async delete(sessionId) {
      sessions.delete(sessionId);
    },
  };
}

function createMockSessionKeyStore(): SessionKeyStore & {
  _keys: Map<string, SessionKeyData>;
} {
  const keys = new Map<string, SessionKeyData>();

  return {
    _keys: keys,

    async save(k) {
      keys.set(`${k.address}:${k.keyId}`, k);
    },

    async get(address, keyId) {
      return keys.get(`${address}:${keyId}`) ?? null;
    },

    async list(address) {
      return Array.from(keys.values()).filter((k) => k.address === address);
    },

    async delete(address, keyId) {
      return keys.delete(`${address}:${keyId}`);
    },

    async validate(address, keyId, operation) {
      const k = keys.get(`${address}:${keyId}`);
      if (!k) {
        return { valid: false, isActive: false, hasScope: false, expiry: 0, remainingSeconds: 0 };
      }
      const now = Math.floor(Date.now() / 1000);
      const isActive = k.expiry > now;
      const hasScope = k.scopes.includes(operation);
      return {
        valid: isActive && hasScope,
        isActive,
        hasScope,
        expiry: k.expiry,
        remainingSeconds: Math.max(0, k.expiry - now),
      };
    },
  };
}

describe("Auth + Session Keys", () => {
  let mockSessionStore: ReturnType<typeof createMockSessionStore>;
  let mockSessionKeyStore: ReturnType<typeof createMockSessionKeyStore>;
  let app: ReturnType<typeof createApp>;

  // Valid EIP-55 checksum address
  const TEST_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const TEST_SESSION_ID = "test-session-id-123";

  beforeEach(() => {
    mockSessionStore = createMockSessionStore();
    mockSessionKeyStore = createMockSessionKeyStore();

    // Pre-create a session for authenticated tests
    mockSessionStore._sessions.set(TEST_SESSION_ID, {
      address: TEST_ADDRESS,
      chainId: 412346,
      username: "testuser",
    });

    app = createApp({
      sessionStore: mockSessionStore,
      sessionKeyStore: mockSessionKeyStore,
      session: { address: TEST_ADDRESS, chainId: 412346, username: "testuser" },
    });
  });

  describe("Auth - GET /auth/challenge", () => {
    it("generates a SIWE challenge message", async () => {
      const res = await app.request(`/auth/challenge?address=${TEST_ADDRESS}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.nonce).toBeTruthy();
      expect(body.message).toContain(TEST_ADDRESS);
      expect(body.message).toContain("MemoryChain");
      expect(body.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("returns 400 when address is missing", async () => {
      const res = await app.request("/auth/challenge");

      expect(res.status).toBe(400);
    });
  });

  describe("Auth - GET /auth/session", () => {
    it("returns session when authenticated", async () => {
      const res = await app.request("/auth/session");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.address).toBe(TEST_ADDRESS);
      expect(body.chainId).toBe(412346);
      expect(body.username).toBe("testuser");
    });

    it("returns 401 when not authenticated", async () => {
      const unauthedApp = createApp();
      const res = await unauthedApp.request("/auth/session");

      expect(res.status).toBe(401);
    });
  });

  describe("Auth - DELETE /auth/session", () => {
    it("clears the session", async () => {
      const res = await app.request("/auth/session", { method: "DELETE" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });

  describe("Session Keys - POST /session-keys", () => {
    it("creates a session key", async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;

      const res = await app.request("/session-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKeyAddress: "0xsessionkey123",
          permissionsContext: "0xcontext456",
          expiry: futureExpiry,
          scopes: ["consumeCredits(address,uint64)", "createMemory(string,bytes32,uint8,uint8)"],
        }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.keyId).toBeTruthy();
      expect(body.sessionKeyAddress).toBe("0xsessionkey123");
      expect(body.expiry).toBe(futureExpiry);
      expect(body.scopes).toHaveLength(2);
    });

    it("returns 401 when not authenticated", async () => {
      const unauthedApp = createApp({ sessionKeyStore: mockSessionKeyStore });
      const res = await unauthedApp.request("/session-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKeyAddress: "0xsessionkey",
          permissionsContext: "0xcontext",
          expiry: Math.floor(Date.now() / 1000) + 3600,
          scopes: ["test()"],
        }),
      });

      expect(res.status).toBe(401);
    });

    it("returns 400 for invalid request", async () => {
      const res = await app.request("/session-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionKeyAddress: "0x123" }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 400 when expiry is in the past", async () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600;

      const res = await app.request("/session-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKeyAddress: "0xsessionkey",
          permissionsContext: "0xcontext",
          expiry: pastExpiry,
          scopes: ["test()"],
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe("Session Keys - GET /session-keys", () => {
    it("lists session keys for the user", async () => {
      // Create two keys
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
      await app.request("/session-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKeyAddress: "0xkey1",
          permissionsContext: "0xctx1",
          expiry: futureExpiry,
          scopes: ["test1()"],
        }),
      });
      await app.request("/session-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKeyAddress: "0xkey2",
          permissionsContext: "0xctx2",
          expiry: futureExpiry,
          scopes: ["test2()"],
        }),
      });

      const res = await app.request("/session-keys");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.keys).toHaveLength(2);
      expect(body.keys[0].isActive).toBe(true);
    });
  });

  describe("Session Keys - GET /session-keys/:keyId", () => {
    it("returns session key details", async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
      const createRes = await app.request("/session-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKeyAddress: "0xkey",
          permissionsContext: "0xctx",
          expiry: futureExpiry,
          scopes: ["test()"],
        }),
      });
      const { keyId } = await createRes.json();

      const res = await app.request(`/session-keys/${keyId}`);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.keyId).toBe(keyId);
      expect(body.isActive).toBe(true);
    });

    it("returns 404 for non-existent key", async () => {
      const res = await app.request("/session-keys/non-existent");

      expect(res.status).toBe(404);
    });
  });

  describe("Session Keys - DELETE /session-keys/:keyId", () => {
    it("revokes a session key", async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
      const createRes = await app.request("/session-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKeyAddress: "0xkey",
          permissionsContext: "0xctx",
          expiry: futureExpiry,
          scopes: ["test()"],
        }),
      });
      const { keyId } = await createRes.json();

      const res = await app.request(`/session-keys/${keyId}`, { method: "DELETE" });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);

      // Verify it's gone
      const getRes = await app.request(`/session-keys/${keyId}`);
      expect(getRes.status).toBe(404);
    });
  });

  describe("Session Keys - POST /session-keys/:keyId/validate", () => {
    it("validates an active session key with matching scope", async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
      const createRes = await app.request("/session-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKeyAddress: "0xkey",
          permissionsContext: "0xctx",
          expiry: futureExpiry,
          scopes: ["consumeCredits(address,uint64)"],
        }),
      });
      const { keyId } = await createRes.json();

      const res = await app.request(`/session-keys/${keyId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "consumeCredits(address,uint64)" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(true);
      expect(body.isActive).toBe(true);
      expect(body.hasScope).toBe(true);
      expect(body.remainingSeconds).toBeGreaterThan(0);
    });

    it("rejects when operation is not in scope", async () => {
      const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
      const createRes = await app.request("/session-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKeyAddress: "0xkey",
          permissionsContext: "0xctx",
          expiry: futureExpiry,
          scopes: ["consumeCredits(address,uint64)"],
        }),
      });
      const { keyId } = await createRes.json();

      const res = await app.request(`/session-keys/${keyId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "transfer(address,uint256)" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.hasScope).toBe(false);
    });

    it("rejects expired session key", async () => {
      const pastExpiry = Math.floor(Date.now() / 1000) - 3600;
      const createRes = await app.request("/session-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionKeyAddress: "0xkey",
          permissionsContext: "0xctx",
          expiry: pastExpiry,
          scopes: ["test()"],
        }),
      });
      const { keyId } = await createRes.json();

      const res = await app.request(`/session-keys/${keyId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "test()" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.valid).toBe(false);
      expect(body.isActive).toBe(false);
    });
  });
});
