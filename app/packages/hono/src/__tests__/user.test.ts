import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../index.js";
import type { UserRegistryContract, UserData } from "../types/contracts.js";

function createMockUserRegistry(): UserRegistryContract & {
  _users: Map<string, UserData>;
} {
  const users = new Map<string, UserData>();

  return {
    _users: users,

    async registerUser(owner, username) {
      if (users.has(owner)) {
        return { success: false, error: "ALREADY_REGISTERED" };
      }
      // Check username uniqueness
      for (const u of users.values()) {
        if (u.username === username) {
          return { success: false, error: "USERNAME_TAKEN" };
        }
      }
      users.set(owner, {
        address: owner,
        username,
        isRegistered: true,
        isActive: true,
        totalAgents: 0,
        totalMemories: 0,
        createdAt: Math.floor(Date.now() / 1000),
      });
      return { success: true };
    },

    async updateUsername(owner, username) {
      const user = users.get(owner);
      if (!user) return { success: false, error: "NOT_REGISTERED" };
      // Check username uniqueness
      for (const u of users.values()) {
        if (u.username === username && u.address !== owner) {
          return { success: false, error: "USERNAME_TAKEN" };
        }
      }
      user.username = username;
      return { success: true };
    },

    async getUser(owner) {
      const user = users.get(owner);
      if (!user) {
        return {
          success: true,
          data: {
            address: owner,
            username: null,
            isRegistered: false,
            isActive: false,
            totalAgents: 0,
            totalMemories: 0,
            createdAt: 0,
          },
        };
      }
      return { success: true, data: user };
    },
  };
}

describe("User routes", () => {
  let mockRegistry: ReturnType<typeof createMockUserRegistry>;
  let app: ReturnType<typeof createApp>;

  const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

  beforeEach(() => {
    mockRegistry = createMockUserRegistry();
    app = createApp({
      session: { address: TEST_ADDRESS, chainId: 412346, username: null },
      userRegistry: mockRegistry,
    });
  });

  describe("GET /user/me", () => {
    it("returns unregistered user profile", async () => {
      const res = await app.request("/user/me");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.address).toBe(TEST_ADDRESS);
      expect(body.isRegistered).toBe(false);
      expect(body.username).toBeNull();
    });

    it("returns registered user profile", async () => {
      await mockRegistry.registerUser(TEST_ADDRESS, "alice");

      const res = await app.request("/user/me");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.isRegistered).toBe(true);
      expect(body.username).toBe("alice");
      expect(body.isActive).toBe(true);
    });

    it("returns 401 when not authenticated", async () => {
      const unauthedApp = createApp({ userRegistry: mockRegistry });
      const res = await unauthedApp.request("/user/me");

      expect(res.status).toBe(401);
    });
  });

  describe("POST /user/register", () => {
    it("registers a new user", async () => {
      const res = await app.request("/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.address).toBe(TEST_ADDRESS);
      expect(body.username).toBe("alice");
    });

    it("returns 409 when already registered", async () => {
      await app.request("/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice" }),
      });

      const res = await app.request("/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice2" }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe("ALREADY_REGISTERED");
    });

    it("returns 409 when username is taken", async () => {
      await app.request("/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice" }),
      });

      // Different wallet, same username
      const otherApp = createApp({
        session: { address: "0xbob", chainId: 412346, username: null },
        userRegistry: mockRegistry,
      });

      const res = await otherApp.request("/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice" }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe("USERNAME_TAKEN");
    });

    it("returns 400 for invalid username", async () => {
      const res = await app.request("/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "" }),
      });

      expect(res.status).toBe(400);
    });

    it("returns 401 when not authenticated", async () => {
      const unauthedApp = createApp({ userRegistry: mockRegistry });
      const res = await unauthedApp.request("/user/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice" }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe("PUT /user/username", () => {
    it("updates username", async () => {
      await mockRegistry.registerUser(TEST_ADDRESS, "alice");

      const res = await app.request("/user/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "alice_updated" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.username).toBe("alice_updated");
    });

    it("returns 409 when new username is taken", async () => {
      await mockRegistry.registerUser(TEST_ADDRESS, "alice");
      await mockRegistry.registerUser("0xbob", "bob");

      const res = await app.request("/user/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "bob" }),
      });

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.code).toBe("USERNAME_TAKEN");
    });

    it("returns 404 when not registered", async () => {
      const res = await app.request("/user/username", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "newname" }),
      });

      expect(res.status).toBe(404);
    });
  });
});
