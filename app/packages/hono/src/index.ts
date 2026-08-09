import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { createIpfsClient, type IpfsClient } from "./lib/ipfs.js";
import { createAgentRegistryAdapter, createMemoryRegistryAdapter, createUserRegistryAdapter, createCreditManagerAdapter, createContextRegistryAdapter, createAuditRegistryAdapter, createChatRegistryAdapter } from "./lib/contracts.js";
import { createIpfsRoutes } from "./routes/ipfs.js";
import { createMemoryRoutes } from "./routes/memories.js";
import { createAgentRoutes } from "./routes/agents.js";
import { createContextRoutes } from "./routes/context.js";

import { createCreditRoutes } from "./routes/credits.js";
import { createUserRoutes } from "./routes/user.js";
import { createAuthRoutes } from "./routes/auth.js";
import { createSessionKeyRoutes } from "./routes/session-keys.js";
import { createAuditRoutes } from "./routes/audit.js";
import { createChatRoutes } from "./routes/chat.js";
import { createRedisSessionKeyStore } from "./lib/session-keys.js";
import type {
  MemoryRegistryContract,
  AgentRegistryContract,
  ContextRegistryContract,
  CreditManagerContract,
  UserRegistryContract,
  AuditRegistryContract,
  ChatRegistryContract,
} from "./types/contracts.js";
import type { SessionStore, SessionData, SessionKeyStore } from "./types/session.js";
import type { SessionKeyManager } from "./lib/session-key-manager.js";

export type { SessionData, SessionStore, SessionKeyStore } from "./types/session.js";

export type AppEnv = {
  Variables: {
    session: SessionData | null;
  };
};

export type AppDependencies = {
  ipfs?: IpfsClient;
  memoryRegistry?: MemoryRegistryContract;
  agentRegistry?: AgentRegistryContract;
  contextRegistry?: ContextRegistryContract;
  chatRegistry?: ChatRegistryContract;
  creditManager?: CreditManagerContract;
  userRegistry?: UserRegistryContract;
  auditRegistry?: AuditRegistryContract;
  sessionStore?: SessionStore;
  sessionKeyStore?: SessionKeyStore;
  sessionKeyManager?: SessionKeyManager;
  session?: SessionData | null;
};

function createMemorySessionStore(): SessionStore {
  const store = new Map<string, { data: SessionData; expiresAt: number }>();
  return {
    async get(sessionId: string) {
      const entry = store.get(sessionId);
      if (!entry || entry.expiresAt < Date.now()) {
        store.delete(sessionId);
        return null;
      }
      return entry.data;
    },
    async set(sessionId: string, data: SessionData, ttlSeconds: number) {
      store.set(sessionId, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
    async delete(sessionId: string) {
      store.delete(sessionId);
    },
  };
}

export function createApp(deps: AppDependencies = {}): Hono<AppEnv> {
  const ipfs = deps.ipfs ?? createIpfsClient({ apiUrl: process.env.IPFS_API_URL ?? "http://localhost:5001" });
  const memoryRegistry = deps.memoryRegistry;
  const agentRegistry = deps.agentRegistry;
  const contextRegistry = deps.contextRegistry;
  const chatRegistry = deps.chatRegistry;
  const auditRegistry = deps.auditRegistry;
  const creditManager = deps.creditManager;
  const userRegistry = deps.userRegistry;
  const sessionStore = deps.sessionStore ?? createMemorySessionStore();
  const sessionKeyStore = deps.sessionKeyStore;
  const sessionKeyManager = deps.sessionKeyManager;

  const app = new Hono<AppEnv>();

  app.use("*", cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
  }));

  // Dev session middleware: auto-auth with wallet address from header
  const devWalletAuthEnabled = process.env.ENABLE_DEV_WALLET_AUTH === "true";
  console.log("[Middleware] ENABLE_DEV_WALLET_AUTH:", devWalletAuthEnabled);
  app.use("*", async (c, next) => {
    if (devWalletAuthEnabled) {
      const devAddress = c.req.header("X-Dev-Wallet");
      if (devAddress) {
        console.log("[Middleware] Dev wallet auth: setting session for", devAddress);
        c.set("session", { address: devAddress, chainId: 412346, username: "dev-user" });
      }
    }
    await next();
  });

  // Request logging
  app.use("*", async (c, next) => {
    console.log(`→ ${c.req.method} ${c.req.url}`);
    await next();
    console.log(`← ${c.req.method} ${c.req.url} ${c.res.status}`);
  });

  // Session middleware: resolve session from cookie
  app.use("*", async (c, next) => {
    if (!c.get("session")) {
      const cookieHeader = c.req.header("Cookie");
      const sessionId = cookieHeader?.split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith("session="))
        ?.split("=")[1];

      console.log("[Middleware] Session lookup | cookie:", sessionId || "(none)");

      if (sessionId) {
        const sessionData = await sessionStore.get(sessionId);
        console.log("[Middleware] Session lookup | store.get:", sessionData ? `found (${sessionData.address})` : "miss");
        if (sessionData) {
          c.set("session", sessionData);
        } else {
          c.set("session", null);
        }
      } else {
        c.set("session", deps.session ?? null);
      }
    } else {
      console.log("[Middleware] Session already set:", c.get("session")?.address || "(none)");
    }
    await next();
  });

  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  // Auth routes (session management)
  app.route("/auth", createAuthRoutes(sessionStore));

  // Session key routes
  if (sessionKeyStore) {
    app.route("/session-keys", createSessionKeyRoutes(sessionKeyStore, sessionKeyManager));
  }

  app.route("/ipfs", createIpfsRoutes(ipfs));

  if (memoryRegistry) {
    app.route("/memories", createMemoryRoutes(memoryRegistry, auditRegistry));
  }

  if (agentRegistry) {
    app.route("/agents", createAgentRoutes(agentRegistry, auditRegistry));
  }

  if (contextRegistry) {
    app.route("/context", createContextRoutes(contextRegistry, auditRegistry));
  }

  if (creditManager) {
    app.route("/credits", createCreditRoutes(creditManager));
  }

  if (userRegistry) {
    app.route("/user", createUserRoutes(userRegistry));
  }

  if (auditRegistry) {
    app.route("/audit", createAuditRoutes(auditRegistry));
  }

  // Chat routes (always available)
  app.route("/chat", createChatRoutes(agentRegistry, memoryRegistry, contextRegistry, chatRegistry));

  return app;
}

const PORT = Number(process.env.PORT) || 3001;

const isDev = process.env.NODE_ENV !== "production";
const agentRegistry = isDev ? createAgentRegistryAdapter() : undefined;
const memoryRegistry = isDev ? createMemoryRegistryAdapter() : undefined;
const chatRegistry = isDev ? createChatRegistryAdapter() : undefined;
const userRegistry = isDev ? createUserRegistryAdapter() : undefined;
const creditManager = isDev ? createCreditManagerAdapter() : undefined;
const contextRegistry = isDev ? createContextRegistryAdapter() : undefined;
const auditRegistry = isDev ? createAuditRegistryAdapter() : undefined;

// Session key store: in-memory for dev, Redis for production
const sessionKeyStore: SessionKeyStore | undefined = (() => {
  if (process.env.REDIS_URL || process.env.NODE_ENV === "production") {
    try {
      const Redis = require("ioredis");
      const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
      return createRedisSessionKeyStore(redis);
    } catch (err) {
      console.warn("[SessionKeyStore] Redis not available, session keys disabled");
      return undefined;
    }
  }
  return undefined;
})();

serve({ fetch: createApp({ agentRegistry, memoryRegistry, chatRegistry, userRegistry, creditManager, contextRegistry, auditRegistry, sessionKeyStore }).fetch, port: PORT }, (info) => {
  console.log(`🚀 Hono server running on http://localhost:${info.port}`);
  if (agentRegistry) console.log(`⛓️  AgentRegistry connected`);
  if (memoryRegistry) console.log(`⛓️  MemoryRegistry connected`);
  if (chatRegistry) console.log(`⛓️  ChatRegistry connected`);
  if (userRegistry) console.log(`⛓️  UserRegistry connected`);
  if (creditManager) console.log(`⛓️  CreditManager connected`);
  if (contextRegistry) console.log(`⛓️  ContextRegistry connected`);
  if (auditRegistry) console.log(`⛓️  AuditRegistry connected`);
});
