import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { defineChain } from "viem";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
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
  ContractResult,
} from "../types/contracts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEPLOYMENTS_DIR = path.resolve(__dirname, "../../../stylus/deployments");

const RPC_URL = process.env.RPC_URL || "http://localhost:8547";
const DEV_PRIVATE_KEY = (process.env.DEV_PRIVATE_KEY ||
  "0x64cf8b4376aca8e153f2aca74b7f5f59e19b8bbb2da594a98095729ba12a9f6c") as Hex;

const nitroChain = defineChain({
  id: 412346,
  name: "Nitro DevNode",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
});

const account = privateKeyToAccount(DEV_PRIVATE_KEY);

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
const userAbi = loadAbi("user-registry");
const creditAbi = loadAbi("credit-manager");
const contextAbi = loadAbi("context-registry");
const auditAbi = loadAbi("audit-registry");

const publicClient = createPublicClient({ chain: nitroChain, transport: http(RPC_URL) });
const walletClient = createWalletClient({ account, chain: nitroChain, transport: http(RPC_URL) });

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

export function createAgentRegistryAdapter(): AgentRegistryContract {
  const address = deployments["agent-registry"].address as `0x${string}`;

  return {
    async createAgent(owner, name, description, cid, hash): Promise<ContractResult<string>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: agentAbi,
          functionName: "createAgent",
          args: [cid, hash as `0x${string}`],
          account,
        });
        const hash_ = await walletClient.writeContract(request);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: hash_ });

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

        return { success: true, data: bytes32ToHex(agentId) };
      } catch (err: any) {
        console.error("createAgent error:", err.message);
        return { success: false, error: err.message };
      }
    },

    async updateAgent(owner, agentId, cid, hash): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: agentAbi,
          functionName: "updateAgent",
          args: [agentId as `0x${string}`, cid, hash as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async archiveAgent(owner, agentId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: agentAbi,
          functionName: "archiveAgent",
          args: [agentId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async restoreAgent(owner, agentId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: agentAbi,
          functionName: "restoreAgent",
          args: [agentId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
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
        const [owner, version, cid, hash, status, createdAt, updatedAt] = result as any[];
        return {
          success: true,
          data: {
            agentId,
            owner: owner as string,
            name: "",
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

    async getAgentVersion(agentId, version): Promise<ContractResult<{ version: number; cid: string; hash: string; createdAt: number }>> {
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
        const agents: AgentData[] = [];
        for (let i = offset; i < offset + limit; i++) {
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
    async createMemory(owner, name, cid, hash, memoryType, visibility): Promise<ContractResult<string>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: memoryAbi,
          functionName: "createMemory",
          args: [cid, hash as `0x${string}`, memoryType, visibility],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });

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

        return { success: true, data: bytes32ToHex(memoryId) };
      } catch (err: any) {
        console.error("createMemory error:", err.message);
        return { success: false, error: err.message };
      }
    },

    async updateMemory(owner, memoryId, cid, hash): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: memoryAbi,
          functionName: "updateMemory",
          args: [memoryId as `0x${string}`, cid, hash as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async archiveMemory(owner, memoryId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: memoryAbi,
          functionName: "archiveMemory",
          args: [memoryId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async restoreMemory(owner, memoryId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: memoryAbi,
          functionName: "restoreMemory",
          args: [memoryId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
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
        const [owner, version, cid, hash, memoryType, visibility, status] = result as any[];
        return {
          success: true,
          data: {
            memoryId,
            owner: owner as string,
            name: "",
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

    async getMemoryVersion(memoryId, version): Promise<ContractResult<{ version: number; cid: string; hash: string; createdAt: number }>> {
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
        const memories: MemoryData[] = [];
        for (let i = offset; i < offset + limit; i++) {
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
    async registerUser(owner, username): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: userAbi,
          functionName: "registerUser",
          args: [username],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async updateUsername(owner, username): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: userAbi,
          functionName: "updateUsername",
          args: [username],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
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
        const result = await publicClient.readContract({
          address,
          abi: creditAbi,
          functionName: "balanceOf",
          args: [user as `0x${string}`],
        });
        const [purchased, spent] = result as [bigint, bigint];
        return {
          success: true,
          data: {
            balance: Number(purchased) - Number(spent),
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

    async getFees(): Promise<ContractResult<FeeSchedule>> {
      try {
        const ops = [0, 1, 2, 3, 4, 5, 6];
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
    async linkMemory(owner, agentId, memoryId, priority): Promise<ContractResult<string>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: contextAbi,
          functionName: "linkMemory",
          args: [agentId as `0x${string}`, memoryId as `0x${string}`, priority],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });

        const count = await publicClient.readContract({
          address,
          abi: contextAbi,
          functionName: "getAgentContextCount",
          args: [agentId as `0x${string}`],
        });
        const contextId = await publicClient.readContract({
          address,
          abi: contextAbi,
          functionName: "getAgentContextByIndex",
          args: [agentId as `0x${string}`, BigInt(toNumber(count) - 1)],
        });

        return { success: true, data: bytes32ToHex(contextId) };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async unlinkMemory(owner, agentId, memoryId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: contextAbi,
          functionName: "unlinkMemory",
          args: [agentId as `0x${string}`, memoryId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { success: true, data: undefined };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async changePriority(owner, contextId, newPriority): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: contextAbi,
          functionName: "changePriority",
          args: [contextId as `0x${string}`, newPriority],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { success: true, data: undefined };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async disableLink(owner, contextId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: contextAbi,
          functionName: "disableLink",
          args: [contextId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { success: true, data: undefined };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async enableLink(owner, contextId): Promise<ContractResult<void>> {
      try {
        const { request } = await publicClient.simulateContract({
          address,
          abi: contextAbi,
          functionName: "enableLink",
          args: [contextId as `0x${string}`],
          account,
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({ hash: txHash });
        return { success: true, data: undefined };
      } catch (err: any) {
        return { success: false, error: err.message };
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
        return { success: false, error: err.message };
      }
    },

    async getAgentContextCount(agentId): Promise<ContractResult<number>> {
      try {
        const result = await publicClient.readContract({
          address,
          abi: contextAbi,
          functionName: "getAgentContextCount",
          args: [agentId as `0x${string}`],
        });
        return { success: true, data: toNumber(result) };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    },

    async getAgentContexts(agentId, offset, limit): Promise<ContractResult<ContextData[]>> {
      try {
        const countResult = await this.getAgentContextCount(agentId);
        if (!countResult.success) {
          return { success: false, error: countResult.error };
        }
        const total = countResult.data!;
        const end = Math.min(offset + limit, total);
        const contexts: ContextData[] = [];

        for (let i = offset; i < end; i++) {
          const contextId = await publicClient.readContract({
            address,
            abi: contextAbi,
            functionName: "getAgentContextByIndex",
            args: [agentId as `0x${string}`, BigInt(i)],
          });
          const ctxResult = await this.getContext(bytes32ToHex(contextId));
          if (ctxResult.success && ctxResult.data) {
            contexts.push(ctxResult.data);
          }
        }

        return { success: true, data: contexts };
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
