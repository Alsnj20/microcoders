import { describe, it, expect, beforeEach } from "vitest";
import { createApp } from "../index.js";
import type {
  CreditManagerContract,
  CreditBalance,
  FeeSchedule,
  PricingConfig,
} from "../types/contracts.js";

function createMockCreditManager(): CreditManagerContract {
  const balances = new Map<string, CreditBalance>();

  return {
    async balanceOf(user) {
      const data = balances.get(user) ?? { balance: 0, purchased: 0, spent: 0 };
      return { success: true, data };
    },

    async hasSufficientCredits(user, amount) {
      const data = balances.get(user);
      return { success: true, data: (data?.balance ?? 0) >= amount };
    },

    async getFees() {
      return {
        success: true,
        data: {
          registerUser: 0,
          createMemory: 1,
          updateMemory: 1,
          createAgent: 5,
          updateAgent: 2,
          executeAgent: 2,
          linkMemory: 1,
        },
      };
    },

    async getPricing() {
      return {
        success: true,
        data: {
          isTestnet: true,
          treasury: "0x636b53B6DdA21FD7c953677ab1aA892A9957E97b",
          pricePerCredit: "1000000000000",
          minPurchase: "1",
          maxPurchase: "1000",
        },
      };
    },

    // Expose for test setup
    _setBalance(user: string, balance: CreditBalance) {
      balances.set(user, balance);
    },
  } as CreditManagerContract & { _setBalance: (user: string, b: CreditBalance) => void };
}

describe("Credit routes", () => {
  let mockCredits: ReturnType<typeof createMockCreditManager>;
  let app: ReturnType<typeof createApp>;

  const TEST_ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";

  beforeEach(() => {
    mockCredits = createMockCreditManager();
    app = createApp({
      session: { address: TEST_ADDRESS, chainId: 412346, username: "testuser" },
      creditManager: mockCredits,
    });
  });

  describe("GET /credits/balance", () => {
    it("returns user credit balance", async () => {
      (mockCredits as ReturnType<typeof createMockCreditManager> & { _setBalance: typeof mockCredits._setBalance })._setBalance(TEST_ADDRESS, {
        balance: 100,
        purchased: 150,
        spent: 50,
      });

      const res = await app.request("/credits/balance");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.balance).toBe(100);
      expect(body.purchased).toBe(150);
      expect(body.spent).toBe(50);
    });

    it("returns zero balance for new user", async () => {
      const res = await app.request("/credits/balance");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.balance).toBe(0);
      expect(body.purchased).toBe(0);
      expect(body.spent).toBe(0);
    });

    it("returns 401 when not authenticated", async () => {
      const unauthedApp = createApp({ creditManager: mockCredits });
      const res = await unauthedApp.request("/credits/balance");

      expect(res.status).toBe(401);
    });
  });

  describe("GET /credits/fees", () => {
    it("returns fee schedule", async () => {
      const res = await app.request("/credits/fees");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.registerUser).toBe(0);
      expect(body.createMemory).toBe(1);
      expect(body.updateMemory).toBe(1);
      expect(body.createAgent).toBe(5);
      expect(body.updateAgent).toBe(2);
      expect(body.executeAgent).toBe(2);
      expect(body.linkMemory).toBe(1);
    });
  });

  describe("GET /credits/pricing", () => {
    it("returns pricing config", async () => {
      const res = await app.request("/credits/pricing");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.isTestnet).toBe(true);
      expect(body.pricePerCredit).toBe("1000000000000");
    });
  });

  describe("GET /credits/ai-fees", () => {
    it("returns per-provider AI fees", async () => {
      const res = await app.request("/credits/ai-fees");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.fees).toBeInstanceOf(Array);
      expect(body.fees.length).toBeGreaterThan(0);
      expect(body.fees[0]).toHaveProperty("provider");
      expect(body.fees[0]).toHaveProperty("model");
      expect(body.fees[0]).toHaveProperty("costInMC");
      expect(body.fees[0]).toHaveProperty("label");
    });
  });
});
