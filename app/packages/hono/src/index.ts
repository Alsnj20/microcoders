import { Hono } from "hono";
import { cors } from "hono/cors";
import { createIpfsClient, type IpfsClient } from "./lib/ipfs.js";
import { createIpfsRoutes } from "./routes/ipfs.js";
import { createMemoryRoutes } from "./routes/memories.js";
import { createAgentRoutes } from "./routes/agents.js";
import { createContextRoutes } from "./routes/context.js";
import { createChatRoutes } from "./routes/chats.js";
import { createCreditRoutes } from "./routes/credits.js";
import { createUserRoutes } from "./routes/user.js";
import { createAuthRoutes } from "./routes/auth.js";
import { createSessionKeyRoutes } from "./routes/session-keys.js";
import type {
  MemoryRegistryContract,
  AgentRegistryContract,
  ContextRegistryContract,
  ChatRegistryContract,
  CreditManagerContract,
  UserRegistryContract,
} from "./types/contracts.js";
import type { SessionStore, SessionData, SessionKeyStore } from "./types/session.js";

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
  sessionStore?: SessionStore;
  sessionKeyStore?: SessionKeyStore;
  session?: SessionData | null;
};

export function createApp(deps: AppDependencies = {}): Hono<AppEnv> {
  const ipfs = deps.ipfs ?? createIpfsClient({ apiUrl: process.env.IPFS_API_URL ?? "http://localhost:5001" });
  const memoryRegistry = deps.memoryRegistry;
  const agentRegistry = deps.agentRegistry;
  const contextRegistry = deps.contextRegistry;
  const chatRegistry = deps.chatRegistry;
  const creditManager = deps.creditManager;
  const userRegistry = deps.userRegistry;
  const sessionStore = deps.sessionStore;
  const sessionKeyStore = deps.sessionKeyStore;

  const app = new Hono<AppEnv>();

  app.use("*", cors({ origin: "http://localhost:3000", credentials: true }));

  // Session middleware
  app.use("*", async (c, next) => {
    c.set("session", deps.session ?? null);
    await next();
  });

  app.get("/health", (c) => {
    return c.json({ status: "ok" });
  });

  // Auth routes (session management)
  if (sessionStore) {
    app.route("/auth", createAuthRoutes(sessionStore));
  } else {
    // Fallback: session check endpoint without session store
    app.get("/auth/session", (c) => {
      const session = c.get("session");
      if (!session) {
        return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
      }
      return c.json(session);
    });
  }

  // Session key routes
  if (sessionKeyStore) {
    app.route("/session-keys", createSessionKeyRoutes(sessionKeyStore));
  }

  app.route("/ipfs", createIpfsRoutes(ipfs));

  if (memoryRegistry) {
    app.route("/memories", createMemoryRoutes(memoryRegistry));
  }

  if (agentRegistry) {
    app.route("/agents", createAgentRoutes(agentRegistry));
  }

  if (contextRegistry) {
    app.route("/context", createContextRoutes(contextRegistry));
  }

  if (chatRegistry) {
    app.route("/chats", createChatRoutes(chatRegistry));
  }

  if (creditManager) {
    app.route("/credits", createCreditRoutes(creditManager));
  }

  if (userRegistry) {
    app.route("/user", createUserRoutes(userRegistry));
  }

  return app;
}
