import { Hono } from "hono";
import { z } from "zod";
import { createPublicClient, http, defineChain, type Hex } from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import type { CreditManagerContract } from "../types/contracts.js";
import type { SessionKeyStore } from "../types/session.js";
import type { AppEnv } from "../index.js";
import { listFoundryDeployments, type FoundryDeployment } from "../lib/foundry.js";
import { getModelCost } from "../lib/prices.js";
import { resolveAccountFor } from "../lib/resolve-account.js";

function requireSession(c: { get: (key: string) => unknown; json: (body: unknown, status?: number) => Response }) {
  const session = c.get("session");
  if (!session) return null;
  return session as { address: string; chainId: number; username: string | null };
}

function getRpcClient() {
  const rpcUrl = process.env.RPC_URL || "http://localhost:8547";
  const chainId = Number(process.env.CHAIN_ID || 412346);
  const chain =
    chainId === 42161
      ? arbitrum
      : chainId === 421614
        ? arbitrumSepolia
        : defineChain({ id: 412346, name: "Nitro DevNode", nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } } });
  return createPublicClient({ chain, transport: http(rpcUrl) });
}

export function createCreditRoutes(
  creditManager: CreditManagerContract,
  getDeployments: () => Promise<FoundryDeployment[]> = listFoundryDeployments,
  sessionKeyStore?: SessionKeyStore,
): Hono<AppEnv> {
  const routes = new Hono<AppEnv>();

  routes.get("/balance", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const account = await resolveAccountFor(sessionKeyStore, session.address);
    const result = await creditManager.balanceOf(account);
    if (!result.success || !result.data) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error ?? "Failed to read balance" }, 500);
    }

    // ETH balance of the smart account (pays for UserOp gas + credit value).
    let ethBalance = "0";
    try {
      ethBalance = (await getRpcClient().getBalance({ address: account as Hex })).toString();
    } catch {
      // non-fatal: report MC balance only
    }

    return c.json({ ...result.data, account, ethBalance });
  });

  routes.get("/fees", async (c) => {
    const result = await creditManager.getFees();
    if (!result.success || !result.data) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error ?? "Failed to read fees" }, 500);
    }

    return c.json(result.data);
  });

  routes.get("/pricing", async (c) => {
    const result = await creditManager.getPricing();
    if (!result.success || !result.data) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error ?? "Failed to read pricing" }, 500);
    }

    return c.json(result.data);
  });

  routes.get("/ai-fees", async (c) => {
    const deployments = await getDeployments();
    const fees = deployments.map((d) => ({
      provider: d.modelPublisher || "foundry",
      model: d.name,
      label: d.name,
      costInMC: getModelCost(d.name),
      deploymentName: d.name,
      modelName: d.modelName,
      modelVersion: d.modelVersion,
    }));
    return c.json({ fees, source: deployments.length > 0 ? "live" : "error" });
  });

  const BuyCreditsSchema = z.object({
    amount: z.number().int().positive(),
  });

  routes.post("/buy", async (c) => {
    const session = requireSession(c);
    if (!session) {
      return c.json({ code: "AUTH_REQUIRED", message: "No valid session" }, 401);
    }

    const body = await c.req.json();
    const parsed = BuyCreditsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json(
        { code: "VALIDATION_ERROR", message: "Invalid request", details: parsed.error.flatten() },
        400,
      );
    }

    const priceResult = await creditManager.getPricing();
    const pricePerCredit = priceResult.data?.pricePerCredit ?? "100000000000000";
    const totalCost = BigInt(pricePerCredit) * BigInt(parsed.data.amount);

    const result = await creditManager.buyCredits(
      session.address,
      parsed.data.amount,
      totalCost.toString(),
    );

    if (!result.success) {
      return c.json({ code: "CONTRACT_ERROR", message: result.error }, 500);
    }

    const account = await resolveAccountFor(sessionKeyStore, session.address);
    const balance = await creditManager.balanceOf(account);
    return c.json({ success: true, balance: balance.data?.balance ?? 0, account });
  });

  return routes;
}
