import { Hono } from "hono";
import { z } from "zod";
import type { UserRegistryContract } from "../types/contracts.js";
import type { AppEnv } from "../index.js";

const RegisterUserSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, "Only alphanumeric and underscores"),
});

const UpdateUsernameSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/, "Only alphanumeric and underscores"),
});

function requireSession(c: { get: (key: string) => unknown; json: (body: unknown, status?: number) => Response }) {
  const session = c.get("session");
  if (!session) return null;
  return session as { address: string; chainId: number; username: string | null };
}

export function createUserRoutes(userRegistry: UserRegistryContract): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get("/me", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const result = await userRegistry.getUser(session.address);
    if (!result.success || !result.data) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error ?? "Failed to read user" }, 500);
    }

    return c.json(result.data);
  });

  routes.post("/register", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = RegisterUserSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const result = await userRegistry.registerUser(session.address, parsed.data.username);
    if (!result.success) {
      const status = result.error === "ALREADY_REGISTERED" ? 409 : result.error === "USERNAME_TAKEN" ? 409 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    const user = await userRegistry.getUser(session.address);
    return c.json({
      address: session.address,
      username: parsed.data.username,
      registeredAt: user.data?.createdAt ?? Math.floor(Date.now() / 1000),
    });
  });

  routes.put("/username", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = UpdateUsernameSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const result = await userRegistry.updateUsername(session.address, parsed.data.username);
    if (!result.success) {
      const status = result.error === "NOT_REGISTERED" ? 404 : result.error === "USERNAME_TAKEN" ? 409 : 500;
      return c.json({ code: result.error ?? "CONTRACT_ERROR", message: result.error }, status);
    }

    return c.json({
      address: session.address,
      username: parsed.data.username,
      updatedAt: Math.floor(Date.now() / 1000),
    });
  });

  return routes;
}
