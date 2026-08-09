import { Hono } from "hono";
import { z } from "zod";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { SessionKeyStore } from "../types/session.js";
import type { AppEnv } from "../index.js";

const CreateSessionKeySchema = z.object({
  sessionKeyAddress: z.string().min(1),
  permissionsContext: z.string().min(1),
  expiry: z.number().int().positive(),
  scopes: z.array(z.string()).min(1),
});

const ValidateOperationSchema = z.object({
  operation: z.string().min(1),
});

function requireSession(c: { get: (key: string) => unknown; json: (body: unknown, status?: number) => Response }) {
  const session = c.get("session");
  if (!session) return null;
  return session as { address: string; chainId: number; username: string | null };
}

const GenerateSessionKeySchema = z.object({
  permissionsContext: z.string().min(1),
  expiry: z.number().int().positive(),
  scopes: z.array(z.string()).min(1),
});

export function createSessionKeyRoutes(sessionKeyStore: SessionKeyStore, _sessionKeyManager?: unknown): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.post("/generate", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = GenerateSessionKeySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    if (parsed.data.expiry <= Math.floor(Date.now() / 1000)) {
      return c.json({ code: "VALIDATION_ERROR", message: "Expiry must be in the future" }, 400);
    }

    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    const keyId = `sk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await sessionKeyStore.save({
      keyId,
      address: session.address,
      sessionKeyAddress: account.address,
      permissionsContext: parsed.data.permissionsContext,
      expiry: parsed.data.expiry,
      scopes: parsed.data.scopes,
      grantedAt: Math.floor(Date.now() / 1000),
    });

    return c.json({
      keyId,
      sessionKeyAddress: account.address,
      privateKey,
      expiry: parsed.data.expiry,
      scopes: parsed.data.scopes,
      grantedAt: Math.floor(Date.now() / 1000),
    });
  });

  routes.post("/", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = CreateSessionKeySchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    // Check expiry is in the future
    if (parsed.data.expiry <= Math.floor(Date.now() / 1000)) {
      return c.json({ code: "VALIDATION_ERROR", message: "Expiry must be in the future" }, 400);
    }

    const keyId = `sk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    await sessionKeyStore.save({
      keyId,
      address: session.address,
      sessionKeyAddress: parsed.data.sessionKeyAddress,
      permissionsContext: parsed.data.permissionsContext,
      expiry: parsed.data.expiry,
      scopes: parsed.data.scopes,
      grantedAt: Math.floor(Date.now() / 1000),
    });

    return c.json({
      keyId,
      sessionKeyAddress: parsed.data.sessionKeyAddress,
      expiry: parsed.data.expiry,
      scopes: parsed.data.scopes,
      grantedAt: Math.floor(Date.now() / 1000),
    });
  });

  routes.get("/", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const keys = await sessionKeyStore.list(session.address);
    const now = Math.floor(Date.now() / 1000);

    return c.json({
      keys: keys.map((k) => ({
        keyId: k.keyId,
        sessionKeyAddress: k.sessionKeyAddress,
        expiry: k.expiry,
        scopes: k.scopes,
        grantedAt: k.grantedAt,
        isActive: k.expiry > now,
      })),
    });
  });

  routes.get("/:keyId", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const keyId = c.req.param("keyId");
    const key = await sessionKeyStore.get(session.address, keyId);

    if (!key) {
      return c.json({ code: "NOT_FOUND", message: "Session key not found" }, 404);
    }

    const now = Math.floor(Date.now() / 1000);

    return c.json({
      keyId: key.keyId,
      sessionKeyAddress: key.sessionKeyAddress,
      permissionsContext: key.permissionsContext,
      expiry: key.expiry,
      scopes: key.scopes,
      grantedAt: key.grantedAt,
      isActive: key.expiry > now,
    });
  });

  routes.delete("/:keyId", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const keyId = c.req.param("keyId");
    const deleted = await sessionKeyStore.delete(session.address, keyId);

    if (!deleted) {
      return c.json({ code: "NOT_FOUND", message: "Session key not found" }, 404);
    }

    return c.json({ success: true, keyId });
  });

  routes.post("/:keyId/validate", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const keyId = c.req.param("keyId");
    const body = await c.req.json();
    const parsed = ValidateOperationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const result = await sessionKeyStore.validate(session.address, keyId, parsed.data.operation);

    return c.json({
      keyId,
      ...result,
    });
  });

  return routes;
}
