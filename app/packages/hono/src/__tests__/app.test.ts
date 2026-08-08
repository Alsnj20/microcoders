import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApp } from "../index.js";

describe("App", () => {
  const app = createApp();

  describe("GET /auth/session", () => {
    it("returns 401 when no session cookie", async () => {
      const res = await app.request("/auth/session");

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.code).toBe("AUTH_REQUIRED");
    });
  });

  describe("health", () => {
    it("GET /health returns ok", async () => {
      const res = await app.request("/health");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.status).toBe("ok");
    });
  });
});
