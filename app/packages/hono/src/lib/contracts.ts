import { createPublicClient, createWalletClient, http, type Hex, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { nonceManager } from "viem/accounts";
import { defineChain } from "viem";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { buildAndSendUserOp, waitForUserOp } from "./userop-builder.js";
import type {
  AgentRegistryContract,
  AgentData,
  MemoryRegistryContract,
  MemoryData,
  UserRegistryContract,
  UserData,
  CreditManagerContract,
  CreditBalance,
  FeeSchedule,
  PricingConfig,
  ContextRegistryContract,
  ContextData,
  AuditRegistryContract,
  AuditEvent,
  ChatRegistryContract,
  ChatData,
  ContractResult,
} from "../types/contracts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEPLOYMENTS_DIR = path.resolve(__dirname, "../../../stylus/deployments");

const RPC_URL = process.env.RPC_URL || "http://localhost:8547";
const DEV_PRIVATE_KEY = process.env.DEV_PRIVATE_KEY as Hex;

const nitroChain = defineChain({
  id: 412346,
  name: "Nitro DevNode",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
});

const account = privateKeyToAccount(DEV_PRIVATE_KEY);

// Serialize nonce allocation across concurrent writes from the shared signer
// account so rapid create→update sequences never collide/replace each other.
// See walletClient setup below (uses `nonceManager` from viem/accounts).

function loadAbi(contractName: string) {
  const abiPath = path.resolve(DEPLOYMENTS_DIR, contractName);
  if (!fs.existsSync(abiPath)) throw new Error(`ABI not found: ${abiPath}`);
  return JSON.parse(fs.readFileSync(abiPath, "utf8"));
}

function loadDeployment(chainId: string) {
  const deploymentPath = path.resolve(DEPLOYMENTS_DIR, `${chainId}_latest.json`);
  if (!fs.existsSync(deploymentPath)) throw new Error(`Deployment not found: ${deploymentPath}`);
  return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
}

const deployments = loadDeployment("412346");
const agentAbi = loadAbi("agent-registry");
const memoryAbi = loadAbi("memory-registry");
const chatAbi = loadAbi("chat-registry");
const userAbi = loadAbi("user-registry");
const creditAbi = loadAbi("credit-manager");
const contextAbi = loadAbi("context-registry");
const auditAbi = loadAbi("audit-registry");

const publicClient = createPublicClient({ chain: nitroChain, transport: http(RPC_URL) });
// Shared signer account; the nonce manager serializes nonce allocation across
// concurrent writes so create→update sequences don't collide/replace each other.
const walletClient = createWalletClient({ account: { ...account, nonceManager }, chain: nitroChain, transport: http(RPC_URL) });

function bytes32ToHex(val: unknown): string {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "hex" in (val as any)) return (val as any).hex;
  return "0x" + "00".repeat(32);
}

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "bigint") return Number(val);
  return 0;
}

// Wait for a tx and fail loudly if it was mined but reverted. viem's
// waitForTransactionReceipt resolves on reverted receipts, so every write
// must check receipt.status to avoid reporting false success.
async function confirmTx(txHash: Hex): Promise<{ success: boolean; error?: string }> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    return { success: false, error: "Transaction reverted on-chain" };
  }
  return { success: true };
}

export function createAgentRegistryAdapter(): AgentRegistryContract {
  const address = deployments["agent-registry"].address as `0x${string}`;

  return {
    async createAgent(owner, name, _description, cid, hash): Promise<ContractResult<string>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: agentAbi,
          functionName: "createAgent",
          args: [name, cid, hash as `0x${string}`],
          account,
        });
        const hash_ = await walletClient.writeContract(request);
        const confirmed = await confirmTx(hash_);
        if (!confirmed.success) return { success: false, error: confirmed.error };

        // Read the new agent ID from event or totalAgents
        const total = await publicClient.readContract({
          address,
          abi: agentAbi,
          functionName: "totalAgents",
        });
        const agentId = await publicClient.readContract({
          address,
          abi: agentAbi,
          functionName: "getAgentByOwnerIndex",
          args: [owner as `0x${string}`, BigInt(toNumber(total) - 1)],
        });

        const agentIdHex = bytes32ToHex(agentId);

        return { success: true, data: agentIdHex };
      } catch (err: any) {
        console.error("createAgent error:", err.message);
        return { success: false, error: err.message };
      }
    },

    async updateAgent(_owner, agentId, cid, hash): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: agentAbi,
          functionName: "updateAgent",
          args: [agentId as `0x${string}`, cid, hash as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async archiveAgent(_owner, agentId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: agentAbi,
          functionName: "archiveAgent",
          args: [agentId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async restoreAgent(_owner, agentId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: agentAbi,
          functionName: "restoreAgent",
          args: [agentId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getAgent(agentId): Promise<ContractResult<AgentData>> {
      try {
        const result = await publicClient.readContract({
          address,
          abi: agentAbi,
          functionName: "getAgent",
          args: [agentId as `0x${string}`],
        });
        const [owner, version, cid, hash, name, status, createdAt, updatedAt] = result as any[];
        return {
          success: true,
          data: {
            agentId,
            owner: owner as string,
            name: name as string,
            description: "",
            cid: cid as string,
            hash: bytes32ToHex(hash),
            status: toNumber(status),
            version: toNumber(version),
            createdAt: toNumber(createdAt),
            updatedAt: toNumber(updatedAt),
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getAgentVersion(_agentId, _version): Promise<ContractResult<{ version: number; cid: string; hash: string; createdAt: number }>> {
      return { success: false, error: "NOT_IMPLEMENTED" };
    },

    async getAgentCountByOwner(owner): Promise<ContractResult<number>> {
      try {
        const count = await publicClient.readContract({
          address,
          abi: agentAbi,
          functionName: "getAgentCountByOwner",
          args: [owner as `0x${string}`],
        });
        return { success: true, data: toNumber(count) };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getAgentsByOwner(owner, offset, limit): Promise<ContractResult<AgentData[]>> {
      try {
        const count = await publicClient.readContract({
          address,
          abi: agentAbi,
          functionName: "getAgentCountByOwner",
          args: [owner as `0x${string}`],
        });
        const total = Number(count);
        const agents: AgentData[] = [];
        for (let i = offset; i < Math.min(offset + limit, total); i++) {
          const agentId = await publicClient.readContract({
            address,
            abi: agentAbi,
            functionName: "getAgentByOwnerIndex",
            args: [owner as `0x${string}`, BigInt(i)],
          });
          const hexId = bytes32ToHex(agentId);
          if (hexId === "0x" + "00".repeat(32)) break;
          const result = await this.getAgent(hexId);
          if (result.success && result.data) agents.push(result.data);
        }
        return { success: true, data: agents };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  };
}

export function createMemoryRegistryAdapter(): MemoryRegistryContract {
  const address = deployments["memory-registry"].address as `0x${string}`;

  return {
    async createMemory(owner, name, _description, cid, hash, memoryType, visibility): Promise<ContractResult<string>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: memoryAbi,
          functionName: "createMemory",
          args: [name, cid, hash as `0x${string}`, memoryType, visibility],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };

        const total = await publicClient.readContract({
          address,
          abi: memoryAbi,
          functionName: "totalMemories",
        });
        const memoryId = await publicClient.readContract({
          address,
          abi: memoryAbi,
          functionName: "getMemoryByOwnerIndex",
          args: [owner as `0x${string}`, BigInt(toNumber(total) - 1)],
        });

        const memoryIdHex = bytes32ToHex(memoryId);

        return { success: true, data: memoryIdHex };
      } catch (err: any) {
        console.error("createMemory error:", err.message);
        return { success: false, error: err.message };
      }
    },

    async updateMemory(_owner, memoryId, cid, hash): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: memoryAbi,
          functionName: "updateMemory",
          args: [memoryId as `0x${string}`, cid, hash as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async archiveMemory(_owner, memoryId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: memoryAbi,
          functionName: "archiveMemory",
          args: [memoryId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async restoreMemory(_owner, memoryId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: memoryAbi,
          functionName: "restoreMemory",
          args: [memoryId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getMemory(memoryId): Promise<ContractResult<MemoryData>> {
      try {
        const result = await publicClient.readContract({
          address,
          abi: memoryAbi,
          functionName: "getMemory",
          args: [memoryId as `0x${string}`],
        });
        const [owner, version, cid, hash, name, memoryType, visibility, status] = result as any[];
        return {
          success: true,
          data: {
            memoryId,
            owner: owner as string,
            name: name as string,
            description: "",
            cid: cid as string,
            hash: bytes32ToHex(hash),
            memoryType: toNumber(memoryType),
            visibility: toNumber(visibility),
            status: toNumber(status),
            version: toNumber(version),
            createdAt: 0,
            updatedAt: 0,
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getMemoryVersion(_memoryId, _version): Promise<ContractResult<{ version: number; cid: string; hash: string; createdAt: number }>> {
      return { success: false, error: "NOT_IMPLEMENTED" };
    },

    async getMemoryCountByOwner(owner): Promise<ContractResult<number>> {
      try {
        const count = await publicClient.readContract({
          address,
          abi: memoryAbi,
          functionName: "getMemoryCountByOwner",
          args: [owner as `0x${string}`],
        });
        return { success: true, data: toNumber(count) };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getMemoriesByOwner(owner, offset, limit): Promise<ContractResult<MemoryData[]>> {
      try {
        const count = await publicClient.readContract({
          address,
          abi: memoryAbi,
          functionName: "getMemoryCountByOwner",
          args: [owner as `0x${string}`],
        });
        const total = Number(count);
        const memories: MemoryData[] = [];
        for (let i = offset; i < Math.min(offset + limit, total); i++) {
          const memoryId = await publicClient.readContract({
            address,
            abi: memoryAbi,
            functionName: "getMemoryByOwnerIndex",
            args: [owner as `0x${string}`, BigInt(i)],
          });
          const hexId = bytes32ToHex(memoryId);
          if (hexId === "0x" + "00".repeat(32)) break;
          const result = await this.getMemory(hexId);
          if (result.success && result.data) memories.push(result.data);
        }
        return { success: true, data: memories };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  };
}

export function createUserRegistryAdapter(): UserRegistryContract {
  const address = deployments["user-registry"].address as `0x${string}`;

  return {
    async registerUser(_owner, username): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: userAbi,
          functionName: "registerUser",
          args: [username],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async updateUsername(_owner, username): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: userAbi,
          functionName: "updateUsername",
          args: [username],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getUser(owner): Promise<ContractResult<UserData>> {
      try {
        const registered = await publicClient.readContract({
          address,
          abi: userAbi,
          functionName: "isRegistered",
          args: [owner as `0x${string}`],
        });
        if (!registered) {
          return { success: false, error: "NOT_REGISTERED" };
        }
        const username = await publicClient.readContract({
          address,
          abi: userAbi,
          functionName: "getUsername",
          args: [owner as `0x${string}`],
        });
        const active = await publicClient.readContract({
          address,
          abi: userAbi,
          functionName: "isActive",
          args: [owner as `0x${string}`],
        });
        return {
          success: true,
          data: {
            address: owner,
            username: username as string,
            isRegistered: true,
            isActive: active as boolean,
            totalAgents: 0,
            totalMemories: 0,
            createdAt: 0,
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  };
}

export function createCreditManagerAdapter(): CreditManagerContract {
  const address = deployments["credit-manager"].address as `0x${string}`;

  return {
    async balanceOf(user): Promise<ContractResult<CreditBalance>> {
      try {
        const balance = await publicClient.readContract({
          address,
          abi: creditAbi,
          functionName: "balanceOf",
          args: [user as `0x${string}`],
        });
        const purchased = await publicClient.readContract({
          address,
          abi: creditAbi,
          functionName: "totalPurchased",
          args: [user as `0x${string}`],
        });
        const spent = await publicClient.readContract({
          address,
          abi: creditAbi,
          functionName: "totalSpent",
          args: [user as `0x${string}`],
        });
        return {
          success: true,
          data: {
            balance: Number(balance),
            purchased: Number(purchased),
            spent: Number(spent),
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async hasSufficientCredits(user, amount): Promise<ContractResult<boolean>> {
      try {
        const result = await publicClient.readContract({
          address,
          abi: creditAbi,
          functionName: "hasSufficientCredits",
          args: [user as `0x${string}`, BigInt(amount)],
        });
        return { success: true, data: result as boolean };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async buyCredits(_user, amount, valueWei): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: creditAbi,
          functionName: "buyCredits",
          args: [BigInt(amount)],
          value: BigInt(valueWei),
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true, data: undefined };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getFees(): Promise<ContractResult<FeeSchedule>> {
      try {
        const ops = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        const results = await Promise.all(
          ops.map((op) =>
            publicClient.readContract({
              address,
              abi: creditAbi,
              functionName: "get_fee",
              args: [op],
            }),
          ),
        );
        return {
          success: true,
          data: {
            registerUser: Number(results[0]),
            createMemory: Number(results[1]),
            updateMemory: Number(results[2]),
            createAgent: Number(results[3]),
            updateAgent: Number(results[4]),
            executeAgent: Number(results[5]),
            linkMemory: Number(results[6]),
            createChat: Number(results[7]),
            updateChat: Number(results[8]),
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getPricing(): Promise<ContractResult<PricingConfig>> {
      try {
        const result = await publicClient.readContract({
          address,
          abi: creditAbi,
          functionName: "getPricing",
        });
        const [isTestnet, treasury, pricePerCredit, minPurchase, maxPurchase] = result as any[];
        return {
          success: true,
          data: {
            isTestnet: isTestnet as boolean,
            treasury: treasury as string,
            pricePerCredit: pricePerCredit.toString(),
            minPurchase: minPurchase.toString(),
            maxPurchase: maxPurchase.toString(),
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  };
}

export function createContextRegistryAdapter(): ContextRegistryContract {
  const address = deployments["context-registry"].address as `0x${string}`;

  return {
    async linkMemory(_owner, agentId, memoryId, priority): Promise<ContractResult<string>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: contextAbi,
          functionName: "linkMemory",
          args: [agentId as `0x${string}`, memoryId as `0x${string}`, priority],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };

        const contextId = await publicClient.readContract({
          address,
          abi: contextAbi,
          functionName: "getLink",
          args: [agentId as `0x${string}`, memoryId as `0x${string}`],
        });
        return { success: true, data: bytes32ToHex(contextId) };
      } catch (err: any) {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("already linked")) return { success: false, error: "ALREADY_LINKED" };
        if (msg.includes("memory not found")) return { success: false, error: "MEMORY_NOT_FOUND" };
        if (msg.includes("agent not found")) return { success: false, error: "AGENT_NOT_FOUND" };
        console.error("linkMemory error:", err?.message);
        return { success: false, error: err?.message };
      }
    },

    async unlinkMemory(_owner, agentId, memoryId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: contextAbi,
          functionName: "unlinkMemory",
          args: [agentId as `0x${string}`, memoryId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true, data: undefined };
      } catch (err: any) {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
        return { success: false, error: err?.message };
      }
    },

    async changePriority(_owner, contextId, newPriority): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: contextAbi,
          functionName: "changePriority",
          args: [contextId as `0x${string}`, newPriority],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true, data: undefined };
      } catch (err: any) {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
        if (msg.includes("link not active")) return { success: false, error: "LINK_NOT_ACTIVE" };
        return { success: false, error: err?.message };
      }
    },

    async disableLink(_owner, contextId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: contextAbi,
          functionName: "disableLink",
          args: [contextId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true, data: undefined };
      } catch (err: any) {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
        if (msg.includes("already disabled")) return { success: false, error: "ALREADY_DISABLED" };
        return { success: false, error: err?.message };
      }
    },

    async enableLink(_owner, contextId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: contextAbi,
          functionName: "enableLink",
          args: [contextId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true, data: undefined };
      } catch (err: any) {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
        if (msg.includes("already enabled")) return { success: false, error: "ALREADY_ENABLED" };
        return { success: false, error: err?.message };
      }
    },

    async getContext(contextId): Promise<ContractResult<ContextData>> {
      try {
        const result = await publicClient.readContract({
          address,
          abi: contextAbi,
          functionName: "getContext",
          args: [contextId as `0x${string}`],
        });
        const [agentId, memoryId, priority, enabled, createdAt] = result as any[];
        return {
          success: true,
          data: {
            contextId,
            agentId: bytes32ToHex(agentId),
            memoryId: bytes32ToHex(memoryId),
            priority: toNumber(priority),
            enabled: enabled as boolean,
            createdAt: toNumber(createdAt),
          },
        };
      } catch (err: any) {
        const msg = (err?.message || "").toLowerCase();
        if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
        return { success: false, error: err?.message };
      }
    },

    async getAgentContextCount(agentId): Promise<ContractResult<number>> {
      try {
        const count = await publicClient.readContract({
          address,
          abi: contextAbi,
          functionName: "getAgentContextCount",
          args: [agentId as `0x${string}`],
        });
        return { success: true, data: toNumber(count) };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getAgentContexts(agentId, offset, limit): Promise<ContractResult<ContextData[]>> {
      try {
        const count = await publicClient.readContract({
          address,
          abi: contextAbi,
          functionName: "getAgentContextCount",
          args: [agentId as `0x${string}`],
        });
        const total = Number(count);
        const contexts: ContextData[] = [];
        for (let i = offset; i < Math.min(offset + limit, total); i++) {
          const contextId = await publicClient.readContract({
            address,
            abi: contextAbi,
            functionName: "getAgentContextByIndex",
            args: [agentId as `0x${string}`, BigInt(i)],
          });
          const hexId = bytes32ToHex(contextId);
          if (hexId === "0x" + "00".repeat(32)) break;
          const result = await this.getContext(hexId);
          if (result.success && result.data && result.data.enabled) contexts.push(result.data);
        }
        return { success: true, data: contexts };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  };
}

export function createChatRegistryAdapter(): ChatRegistryContract {
  const address = deployments["chat-registry"].address as `0x${string}`;

  return {
    async createChat(owner, name, cid, hash): Promise<ContractResult<string>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: chatAbi,
          functionName: "createChat",
          args: [name, cid, hash as `0x${string}`],
          account,
        });
        const hash_ = await walletClient.writeContract(request);
        const confirmed = await confirmTx(hash_);
        if (!confirmed.success) return { success: false, error: confirmed.error };

        // Read the new chat ID from event or totalChats
        const total = await publicClient.readContract({
          address,
          abi: chatAbi,
          functionName: "totalChats",
        });
        const chatId = await publicClient.readContract({
          address,
          abi: chatAbi,
          functionName: "getChatByOwnerIndex",
          args: [owner as `0x${string}`, BigInt(toNumber(total) - 1)],
        });

        const chatIdHex = bytes32ToHex(chatId);

        return { success: true, data: chatIdHex };
      } catch (err: any) {
        console.error("createChat error:", err.message);
        return { success: false, error: err.message };
      }
    },

    async updateChat(_owner, chatId, cid, hash, name): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: chatAbi,
          functionName: "updateChat",
          args: [chatId as `0x${string}`, cid, hash as `0x${string}`, name],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async archiveChat(_owner, chatId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: chatAbi,
          functionName: "archiveChat",
          args: [chatId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async restoreChat(_owner, chatId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: chatAbi,
          functionName: "restoreChat",
          args: [chatId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const confirmed = await confirmTx(txHash);
        if (!confirmed.success) return { success: false, error: confirmed.error };
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getChat(chatId): Promise<ContractResult<ChatData>> {
      try {
        const result = await publicClient.readContract({
          address,
          abi: chatAbi,
          functionName: "getChat",
          args: [chatId as `0x${string}`],
        });
        const [owner, version, cid, hash, name, status, createdAt, updatedAt] = result as any[];
        return {
          success: true,
          data: {
            chatId,
            owner: owner as string,
            name: (name as string) || "",
            cid: cid as string,
            hash: bytes32ToHex(hash),
            status: toNumber(status),
            version: toNumber(version),
            createdAt: toNumber(createdAt),
            updatedAt: toNumber(updatedAt),
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getChatCountByOwner(owner): Promise<ContractResult<number>> {
      try {
        const count = await publicClient.readContract({
          address,
          abi: chatAbi,
          functionName: "getChatCountByOwner",
          args: [owner as `0x${string}`],
        });
        return { success: true, data: toNumber(count) };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getChatsByOwner(owner, offset, limit): Promise<ContractResult<ChatData[]>> {
      try {
        const count = await publicClient.readContract({
          address,
          abi: chatAbi,
          functionName: "getChatCountByOwner",
          args: [owner as `0x${string}`],
        });
        const total = Number(count);
        const chats: ChatData[] = [];
        for (let i = offset; i < Math.min(offset + limit, total); i++) {
          const chatId = await publicClient.readContract({
            address,
            abi: chatAbi,
            functionName: "getChatByOwnerIndex",
            args: [owner as `0x${string}`, BigInt(i)],
          });
          const hexId = bytes32ToHex(chatId);
          if (hexId === "0x" + "00".repeat(32)) break;
          const result = await this.getChat(hexId);
          if (result.success && result.data) chats.push(result.data);
        }
        return { success: true, data: chats };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  };
}

export function createAuditRegistryAdapter(): AuditRegistryContract {
  const address = deployments["audit-registry"].address as `0x${string}`;

  return {
    async recordAudit(actor, entityType, entityId, action): Promise<ContractResult<string>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: auditAbi,
          functionName: "recordAudit",
          args: [actor as `0x${string}`, entityType, entityId as `0x${string}`, action],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status !== "success") {
          return { success: false, error: "Transaction reverted on-chain" };
        }

        const logs = receipt.logs.filter(
          (log: any) => log.address.toLowerCase() === address.toLowerCase(),
        );
        const eventId = logs[0]?.topics[1]
          ? `0x${logs[0].topics[1].slice(2)}` 
          : `0x${Date.now().toString(16).padStart(64, "0")}`;

        return { success: true, data: eventId };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getAuditEvent(eventId): Promise<ContractResult<AuditEvent>> {
      try {
        const result = await publicClient.readContract({
          address,
          abi: auditAbi,
          functionName: "getAuditEvent",
          args: [eventId as `0x${string}`],
        });
        const [actor, entityType, entityId, action, timestamp] = result as any[];
        return {
          success: true,
          data: {
            eventId,
            actor: actor as string,
            entityType: Number(entityType),
            entityId: bytes32ToHex(entityId),
            action: Number(action),
            timestamp: Number(timestamp),
          },
        };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getTotalEvents(): Promise<ContractResult<number>> {
      try {
        const result = await publicClient.readContract({
          address,
          abi: auditAbi,
          functionName: "totalEvents",
        });
        return { success: true, data: toNumber(result) };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },
  };
}

// UserOp-based adapters: wraps existing adapters to send transactions via bundler
export interface UserOpAdapterFactory {
  createUserRegistryUserOpAdapter(sessionKeyPrivateKey: Hex): UserRegistryContract;
  createMemoryRegistryUserOpAdapter(sessionKeyPrivateKey: Hex): MemoryRegistryContract;
  createAgentRegistryUserOpAdapter(sessionKeyPrivateKey: Hex): AgentRegistryContract;
  createChatRegistryUserOpAdapter(sessionKeyPrivateKey: Hex): ChatRegistryContract;
  createContextRegistryUserOpAdapter(sessionKeyPrivateKey: Hex): ContextRegistryContract;
  createCreditManagerUserOpAdapter(sessionKeyPrivateKey: Hex): CreditManagerContract;
}

export function createUserOpAdapters(): UserOpAdapterFactory {
  return {
    createUserRegistryUserOpAdapter(sessionKeyPrivateKey) {
      const address = deployments["user-registry"].address as `0x${string}`;
      return {
        async registerUser(_owner, username) {
          try {
            const calldata = encodeFunctionData({ abi: userAbi, functionName: "registerUser", args: [username] });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async updateUsername(_owner, username) {
          try {
            const calldata = encodeFunctionData({ abi: userAbi, functionName: "updateUsername", args: [username] });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async getUser(owner) {
          return createUserRegistryAdapter().getUser(owner);
        },
      };
    },

    createMemoryRegistryUserOpAdapter(sessionKeyPrivateKey) {
      const address = deployments["memory-registry"].address as `0x${string}`;
      return {
        async createMemory(owner, name, _description, cid, hash, memoryType, visibility) {
          try {
            const calldata = encodeFunctionData({
              abi: memoryAbi,
              functionName: "createMemory",
              args: [name, cid, hash as `0x${string}`, memoryType, visibility],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            const total = await publicClient.readContract({ address, abi: memoryAbi, functionName: "totalMemories" });
            const memoryId = await publicClient.readContract({
              address, abi: memoryAbi, functionName: "getMemoryByOwnerIndex",
              args: [owner as `0x${string}`, BigInt(toNumber(total) - 1)],
            });
            const memoryIdHex = bytes32ToHex(memoryId);
            return { success: true, data: memoryIdHex };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async updateMemory(_owner, memoryId, cid, hash) {
          try {
            const calldata = encodeFunctionData({
              abi: memoryAbi, functionName: "updateMemory",
              args: [memoryId as `0x${string}`, cid, hash as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async archiveMemory(_owner, memoryId) {
          try {
            const calldata = encodeFunctionData({
              abi: memoryAbi, functionName: "archiveMemory",
              args: [memoryId as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async restoreMemory(_owner, memoryId) {
          try {
            const calldata = encodeFunctionData({
              abi: memoryAbi, functionName: "restoreMemory",
              args: [memoryId as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async getMemory(memoryId) { return createMemoryRegistryAdapter().getMemory(memoryId); },
        async getMemoryVersion(memoryId, version) { return createMemoryRegistryAdapter().getMemoryVersion(memoryId, version); },
        async getMemoryCountByOwner(owner) { return createMemoryRegistryAdapter().getMemoryCountByOwner(owner); },
        async getMemoriesByOwner(owner, offset, limit) { return createMemoryRegistryAdapter().getMemoriesByOwner(owner, offset, limit); },
      };
    },

    createAgentRegistryUserOpAdapter(sessionKeyPrivateKey) {
      const address = deployments["agent-registry"].address as `0x${string}`;
      return {
        async createAgent(owner, name, _description, cid, hash) {
          try {
            const calldata = encodeFunctionData({
              abi: agentAbi, functionName: "createAgent",
              args: [name, cid, hash as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            const total = await publicClient.readContract({ address, abi: agentAbi, functionName: "totalAgents" });
            const agentId = await publicClient.readContract({
              address, abi: agentAbi, functionName: "getAgentByOwnerIndex",
              args: [owner as `0x${string}`, BigInt(toNumber(total) - 1)],
            });
            const agentIdHex = bytes32ToHex(agentId);
            return { success: true, data: agentIdHex };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async updateAgent(_owner, agentId, cid, hash) {
          try {
            const calldata = encodeFunctionData({
              abi: agentAbi, functionName: "updateAgent",
              args: [agentId as `0x${string}`, cid, hash as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async archiveAgent(_owner, agentId) {
          try {
            const calldata = encodeFunctionData({
              abi: agentAbi, functionName: "archiveAgent",
              args: [agentId as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async restoreAgent(_owner, agentId) {
          try {
            const calldata = encodeFunctionData({
              abi: agentAbi, functionName: "restoreAgent",
              args: [agentId as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async getAgent(agentId) { return createAgentRegistryAdapter().getAgent(agentId); },
        async getAgentVersion(agentId, version) { return createAgentRegistryAdapter().getAgentVersion(agentId, version); },
        async getAgentCountByOwner(owner) { return createAgentRegistryAdapter().getAgentCountByOwner(owner); },
        async getAgentsByOwner(owner, offset, limit) { return createAgentRegistryAdapter().getAgentsByOwner(owner, offset, limit); },
      };
    },

    createChatRegistryUserOpAdapter(sessionKeyPrivateKey) {
      const address = deployments["chat-registry"].address as `0x${string}`;
      return {
        async createChat(owner, name, cid, hash) {
          try {
            const calldata = encodeFunctionData({
              abi: chatAbi, functionName: "createChat",
              args: [name, cid, hash as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            const total = await publicClient.readContract({ address, abi: chatAbi, functionName: "totalChats" });
            const chatId = await publicClient.readContract({
              address, abi: chatAbi, functionName: "getChatByOwnerIndex",
              args: [owner as `0x${string}`, BigInt(toNumber(total) - 1)],
            });
            const chatIdHex = bytes32ToHex(chatId);
            return { success: true, data: chatIdHex };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async updateChat(_owner, chatId, cid, hash, name) {
          try {
            const calldata = encodeFunctionData({
              abi: chatAbi, functionName: "updateChat",
              args: [chatId as `0x${string}`, cid, hash as `0x${string}`, name],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async archiveChat(_owner, chatId) {
          try {
            const calldata = encodeFunctionData({
              abi: chatAbi, functionName: "archiveChat",
              args: [chatId as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async restoreChat(_owner, chatId) {
          try {
            const calldata = encodeFunctionData({
              abi: chatAbi, functionName: "restoreChat",
              args: [chatId as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async getChat(chatId) { return createChatRegistryAdapter().getChat(chatId); },
        async getChatCountByOwner(owner) { return createChatRegistryAdapter().getChatCountByOwner(owner); },
        async getChatsByOwner(owner, offset, limit) { return createChatRegistryAdapter().getChatsByOwner(owner, offset, limit); },
      };
    },

    createContextRegistryUserOpAdapter(sessionKeyPrivateKey) {
      const address = deployments["context-registry"].address as `0x${string}`;
      return {
        async linkMemory(_owner, agentId, memoryId, priority) {
          try {
            const calldata = encodeFunctionData({
              abi: contextAbi, functionName: "linkMemory",
              args: [agentId as `0x${string}`, memoryId as `0x${string}`, priority],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            const contextId = await publicClient.readContract({
              address, abi: contextAbi, functionName: "getLink",
              args: [agentId as `0x${string}`, memoryId as `0x${string}`],
            });
            return { success: true, data: bytes32ToHex(contextId) };
          } catch (err: any) {
            const msg = (err?.message || "").toLowerCase();
            if (msg.includes("already linked")) return { success: false, error: "ALREADY_LINKED" };
            return { success: false, error: err.message };
          }
        },
        async unlinkMemory(_owner, agentId, memoryId) {
          try {
            const calldata = encodeFunctionData({
              abi: contextAbi, functionName: "unlinkMemory",
              args: [agentId as `0x${string}`, memoryId as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async changePriority(_owner, contextId, newPriority) {
          try {
            const calldata = encodeFunctionData({
              abi: contextAbi, functionName: "changePriority",
              args: [contextId as `0x${string}`, newPriority],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async disableLink(_owner, contextId) {
          try {
            const calldata = encodeFunctionData({
              abi: contextAbi, functionName: "disableLink",
              args: [contextId as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async enableLink(_owner, contextId) {
          try {
            const calldata = encodeFunctionData({
              abi: contextAbi, functionName: "enableLink",
              args: [contextId as `0x${string}`],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async getContext(contextId) { return createContextRegistryAdapter().getContext(contextId); },
        async getAgentContextCount(agentId) { return createContextRegistryAdapter().getAgentContextCount(agentId); },
        async getAgentContexts(agentId, offset, limit) { return createContextRegistryAdapter().getAgentContexts(agentId, offset, limit); },
      };
    },

    createCreditManagerUserOpAdapter(sessionKeyPrivateKey) {
      const address = deployments["credit-manager"].address as `0x${string}`;
      return {
        async balanceOf(user) { return createCreditManagerAdapter().balanceOf(user); },
        async hasSufficientCredits(user, amount) { return createCreditManagerAdapter().hasSufficientCredits(user, amount); },
        async buyCredits(_user, amount, _valueWei) {
          try {
            const calldata = encodeFunctionData({
              abi: creditAbi, functionName: "buyCredits",
              args: [BigInt(amount)],
            });
            const { userOpHash } = await buildAndSendUserOp({ target: address, calldata, sessionKeyPrivateKey });
            await waitForUserOp(userOpHash);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async getFees() { return createCreditManagerAdapter().getFees(); },
        async getPricing() { return createCreditManagerAdapter().getPricing(); },
      };
    },
  };
}
