import { Hono } from "hono";
import { SiweMessage } from "siwe";
import { randomBytes } from "node:crypto";
import type { SessionStore, SessionData } from "../types/session.js";
import type { AppEnv } from "../index.js";

function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

export function createAuthRoutes(sessionStore: SessionStore): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  // Store nonces temporarily (in production, use Redis with TTL)
  const nonces = new Map<string, { nonce: string; expiresAt: number }>();

  routes.get("/challenge", async (c) => {
    const address = c.req.query("address");
    console.log("[Auth] GET /challenge | address:", address);
    if (!address) {
      return c.json({ code: "VALIDATION_ERROR", message: "address query param required" }, 400);
    }

    const nonce = generateNonce();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
    nonces.set(address.toLowerCase(), { nonce, expiresAt });

    const domain = new URL(c.req.url).host;
    const siweMessage = new SiweMessage({
      domain,
      address,
      statement: "Sign in to MemoryChain",
      uri: c.req.url,
      version: "1",
      chainId: 412346,
      nonce,
    });

    console.log("[Auth] GET /challenge | nonce:", nonce, "| domain:", domain);
    return c.json({
      nonce,
      message: siweMessage.prepareMessage(),
      expiresAt: Math.floor(expiresAt / 1000),
    });
  });

  routes.post("/verify", async (c) => {
    const body = await c.req.json();
    const { message, signature, address } = body;
    console.log("[Auth] POST /verify | address:", address, "| sig:", signature?.substring(0, 20) + "...");

    if (!message || !signature || !address) {
      console.error("[Auth] POST /verify | missing fields");
      return c.json({ code: "VALIDATION_ERROR", message: "message, signature, and address required" }, 400);
    }

    // Verify nonce
    const stored = nonces.get(address.toLowerCase());
    console.log("[Auth] POST /verify | stored nonce:", stored ? stored.nonce : "(none)", "| expired:", stored ? stored.expiresAt < Date.now() : "n/a");
    if (!stored || stored.expiresAt < Date.now()) {
      return c.json({ code: "NONCE_EXPIRED", message: "Nonce expired or not found" }, 400);
    }

    // Verify SIWE message
    const siweMessage = new SiweMessage(message);
    console.log("[Auth] POST /verify | verifying SIWE message...");
    const result = await siweMessage.verify({ signature, nonce: stored.nonce });
    console.log("[Auth] POST /verify | verify result:", result.success);

    if (!result.success) {
      return c.json({ code: "INVALID_SIGNATURE", message: "Signature verification failed" }, 401);
    }

    // Clean up nonce
    nonces.delete(address.toLowerCase());

    // Create session
    const sessionId = generateNonce();
    const sessionData: SessionData = {
      address: siweMessage.address,
      chainId: siweMessage.chainId,
      username: null,
    };

    console.log("[Auth] POST /verify | creating session:", sessionId, "| address:", sessionData.address);
    await sessionStore.set(sessionId, sessionData, 24 * 60 * 60); // 24 hours

    // Set session cookie
    const cookieValue = `session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${24 * 60 * 60}`;
    console.log("[Auth] POST /verify | Set-Cookie:", cookieValue);
    c.header("Set-Cookie", cookieValue);

    return c.json({
      address: sessionData.address,
      chainId: sessionData.chainId,
      username: sessionData.username,
    });
  });

  routes.get("/session", async (c) => {
    const session = c.get("session");
    console.log("[Auth] GET /session | session:", session ? `${session.address}` : "(none)");
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }
    return c.json(session);
  });

  routes.delete("/session", async (c) => {
    const cookieHeader = c.req.header("Cookie");
    const sessionId = cookieHeader?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("session="))
      ?.split("=")[1];

    if (sessionId) {
      await sessionStore.delete(sessionId);
    }

    c.header("Set-Cookie", "session=; Path=/; HttpOnly; Max-Age=0");
    return c.json({ success: true });
  });

  return routes;
}
