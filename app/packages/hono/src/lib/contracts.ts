import { createPublicClient, createWalletClient, http, type Hex, encodeFunctionData, defineChain } from "viem";
import { privateKeyToAccount, nonceManager } from "viem/accounts";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { buildAndSendUserOp, waitForUserOp } from "./userop-builder.js";
import { getSmartAccountAddress, buildInitCode, isSmartAccountDeployed } from "./smart-account.js";
import { decryptPrivateKey } from "./session-key-crypto.js";
import type { SessionKeyStore } from "../types/session.js";
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

// ── Network configuration (env-driven; defaults to the local Nitro dev node) ──

const RPC_URL = process.env.RPC_URL || "http://localhost:8547";
const CHAIN_ID = Number(process.env.CHAIN_ID || 412346);
const DEV_PRIVATE_KEY = process.env.DEV_PRIVATE_KEY as Hex | undefined;

const nitroChain = defineChain({
  id: 412346,
  name: "Nitro DevNode",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
});

/** Target chain: Arbitrum One (42161), Sepolia (421614) or local Nitro (412346). */
export const targetChain = CHAIN_ID === 42161 ? arbitrum : CHAIN_ID === 421614 ? arbitrumSepolia : nitroChain;
/** Canonical deployment-file network name for the target chain. */
export const NETWORK_NAME = CHAIN_ID === 42161 ? "arbitrumOne" : CHAIN_ID === 421614 ? "arbitrumSepolia" : "arbitrumNitro";

function loadAbi(contractName: string) {
  const abiPath = path.resolve(DEPLOYMENTS_DIR, contractName);
  if (!fs.existsSync(abiPath)) throw new Error(`ABI not found: ${abiPath}`);
  return JSON.parse(fs.readFileSync(abiPath, "utf8"));
}

function loadDeployment(networkName: string, chainId: string) {
  const newPath = path.resolve(DEPLOYMENTS_DIR, `${networkName}_${chainId}_latest.json`);
  if (fs.existsSync(newPath)) return JSON.parse(fs.readFileSync(newPath, "utf8"));
  const legacyPath = path.resolve(DEPLOYMENTS_DIR, `${chainId}_latest.json`);
  if (fs.existsSync(legacyPath)) return JSON.parse(fs.readFileSync(legacyPath, "utf8"));
  throw new Error(`Deployment not found: ${newPath}`);
}

let _deployments: any = null;
/** Deployed contract addresses for the target chain (loaded lazily). */
function getDeployments(): any {
  if (!_deployments) {
    _deployments = loadDeployment(NETWORK_NAME, CHAIN_ID.toString());
  }
  return _deployments;
}

/**
 * Lazy ABI: only loads from the deployment dir when the ABI is actually used.
 * Lets the module import cleanly (tests) before any deployment exists.
 */
// biome-ignore lint/suspicious/noExplicitAny: viem works with loose ABI arrays here.
export function lazyAbi(name: string): any[] {
  let loaded: any[];
  function getLoaded() {
    if (!loaded) loaded = loadAbi(name);
    return loaded;
  }
  return new Proxy([] as any[], {
    get(_target, prop) {
      const l = getLoaded();
      return Reflect.get(l, prop, l);
    },
    has(_target, prop) {
      const l = getLoaded();
      return Reflect.has(l, prop);
    },
    ownKeys(_target) {
      const l = getLoaded();
      return Reflect.ownKeys(l);
    },
    getOwnPropertyDescriptor(_target, prop) {
      const l = getLoaded();
      const desc = Reflect.getOwnPropertyDescriptor(l, prop);
      if (desc) desc.configurable = true;
      return desc;
    },
  });
}

const agentAbi = lazyAbi("agent-registry");
const memoryAbi = lazyAbi("memory-registry");
const chatAbi = lazyAbi("chat-registry");
const userAbi = lazyAbi("user-registry");
const creditAbi = lazyAbi("credit-manager");
const contextAbi = lazyAbi("context-registry");
const auditAbi = lazyAbi("audit-registry");

const publicClient = createPublicClient({ chain: targetChain, transport: http(RPC_URL) });

/**
 * Dev-only EOA signer (backend signs everything). Not available in production —
 * there the user signs through their smart account via session keys + UserOps.
 *
 * Constructed lazily: reads never touch the signer, so production (where
 * DEV_PRIVATE_KEY is unset) can still use the read paths of these adapters.
 * Only an actual dev write throws a clear error.
 */
let devSigner: {
  account: ReturnType<typeof privateKeyToAccount>;
  walletClient: ReturnType<typeof createWalletClient>;
} | null = null;
function getDevSigner() {
  if (devSigner) return devSigner;
  if (!DEV_PRIVATE_KEY) {
    throw new Error("DEV_PRIVATE_KEY is required to use the dev (EOA) write adapters");
  }
  const signerAccount = privateKeyToAccount(DEV_PRIVATE_KEY);
  // Serialize nonce allocation across concurrent writes from the shared signer
  // account so rapid create→update sequences never collide/replace each other.
  const signerWalletClient = createWalletClient({
    account: { ...signerAccount, nonceManager },
    chain: targetChain,
    transport: http(RPC_URL),
  });
  devSigner = { account: signerAccount, walletClient: signerWalletClient };
  return devSigner;
}

// Lazy proxies: constructing the signer (and validating DEV_PRIVATE_KEY) only
// happens when a dev write actually runs.
const account = new Proxy({} as ReturnType<typeof privateKeyToAccount>, {
  get(_, prop) {
    const real = getDevSigner().account;
    return Reflect.get(real, prop, real);
  },
});
const walletClient = new Proxy({} as ReturnType<typeof createWalletClient>, {
  get(_, prop) {
    const real = getDevSigner().walletClient;
    return Reflect.get(real, prop, real);
  },
});

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

function decodeRawUtf8Hex(hex: string): string | null {
  try {
    if (!hex || typeof hex !== "string") return null;
    let cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (cleanHex.length === 0 || cleanHex.length % 2 !== 0) return null;
    if (!/^[0-9a-fA-F]+$/.test(cleanHex)) return null;

    if (cleanHex.startsWith("08c379a0") && cleanHex.length >= 138) {
      const lengthHex = cleanHex.slice(72, 136);
      const strLen = parseInt(lengthHex, 16);
      if (strLen > 0 && cleanHex.length >= 136 + strLen * 2) {
        const strHex = cleanHex.slice(136, 136 + strLen * 2);
        const bytes = Buffer.from(strHex, "hex");
        const decoded = bytes.toString("utf8");
        if (decoded.trim()) return decoded.trim();
      }
    }

    const bytes = Buffer.from(cleanHex, "hex");
    const text = bytes.toString("utf8");
    if (/^[\x20-\x7E\s\u00A0-\uFFFF]+$/.test(text) && text.trim().length > 0) {
      return text.trim();
    }
  } catch {
    // Ignore error
  }
  return null;
}

export function parseContractError(err: any): string {
  if (!err) return "Unknown contract error";

  const fullString = `${err.message || ""} ${err.shortMessage || ""} ${err.details || ""} ${err.cause?.message || ""}`;

  const hexMatch = fullString.match(/0x[a-fA-F0-9]{8,}/) || (typeof err.data === "string" ? err.data.match(/0x[a-fA-F0-9]{8,}/) : null);
  if (hexMatch) {
    const decoded = decodeRawUtf8Hex(hexMatch[0]);
    if (decoded) return decoded;
  }

  if (err.shortMessage) return err.shortMessage;
  if (err.message) return err.message;
  return "Transaction reverted on-chain";
}

// Wait for a tx and fail loudly if it was mined but reverted. viem's
// waitForTransactionReceipt resolves on reverted receipts, so every write
// must check receipt.status to avoid reporting false success.
async function confirmTx(
  txHash: Hex,
  callParams?: { to: Hex; data?: Hex; value?: bigint; account?: Hex },
): Promise<{ success: boolean; error?: string }> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== "success") {
    let errorReason = "Transaction reverted on-chain";
    if (callParams && callParams.to) {
      try {
        await publicClient.call({
          to: callParams.to,
          data: callParams.data,
          value: callParams.value,
          account: callParams.account || account.address,
        });
      } catch (err: any) {
        errorReason = parseContractError(err);
      }
    }
    return { success: false, error: errorReason };
  }
  return { success: true };
}

async function executeContractWrite(
  request: any,
  callParams?: { to: Hex; data?: Hex; value?: bigint; account?: Hex },
): Promise<{ success: boolean; error?: string }> {
  try {
    const reqGas = request.gas ? BigInt(request.gas) : 0n;
    const gasLimit = reqGas > 0n ? (reqGas * 15n) / 10n : 1000000n;
    const finalGas = gasLimit > 500000n ? gasLimit : 500000n;

    const txHash = await walletClient.writeContract({
      ...request,
      gas: finalGas,
    });

    return await confirmTx(
      txHash,
      callParams || {
        to: request.address,
        data: request.data,
        value: request.value,
        account: request.account?.address || account.address,
      },
    );
  } catch (err: any) {
    return { success: false, error: parseContractError(err) };
  }
}

export function createAgentRegistryAdapter(): AgentRegistryContract {
  const address = getDeployments()["agent-registry"].address as `0x${string}`;

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
        const calldata = encodeFunctionData({
          abi: agentAbi,
          functionName: "createAgent",
          args: [name, cid, hash as `0x${string}`],
        });
        const confirmed = await executeContractWrite(request, { to: address, data: calldata });
        if (!confirmed.success) return { success: false, error: confirmed.error };

        const count = (await publicClient.readContract({
          address,
          abi: agentAbi,
          functionName: "getAgentCountByOwner",
          args: [owner as `0x${string}`],
        })) as bigint;
        if (count === 0n) return { success: false, error: "agent not found after create" };
        const agentId = await publicClient.readContract({
          address,
          abi: agentAbi,
          functionName: "getAgentByOwnerIndex",
          args: [owner as `0x${string}`, count - 1n],
        });

        const agentIdHex = bytes32ToHex(agentId);

        return { success: true, data: agentIdHex };
      } catch (err: any) {
        console.error("createAgent error:", err.message);
        return { success: false, error: parseContractError(err) };
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
        const calldata = encodeFunctionData({
          abi: agentAbi,
          functionName: "updateAgent",
          args: [agentId as `0x${string}`, cid, hash as `0x${string}`],
        });
        return await executeContractWrite(request, { to: address, data: calldata });
      } catch (err: any) {
        return { success: false, error: parseContractError(err) };
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
        const calldata = encodeFunctionData({
          abi: agentAbi,
          functionName: "archiveAgent",
          args: [agentId as `0x${string}`],
        });
        return await executeContractWrite(request, { to: address, data: calldata });
      } catch (err: any) {
        return { success: false, error: parseContractError(err) };
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
        const calldata = encodeFunctionData({
          abi: agentAbi,
          functionName: "restoreAgent",
          args: [agentId as `0x${string}`],
        });
        return await executeContractWrite(request, { to: address, data: calldata });
      } catch (err: any) {
        return { success: false, error: parseContractError(err) };
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
  const address = getDeployments()["memory-registry"].address as `0x${string}`;

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
        const calldata = encodeFunctionData({
          abi: memoryAbi,
          functionName: "createMemory",
          args: [name, cid, hash as `0x${string}`, memoryType, visibility],
        });
        const confirmed = await executeContractWrite(request, { to: address, data: calldata });
        if (!confirmed.success) return { success: false, error: confirmed.error };

        const count = (await publicClient.readContract({
          address,
          abi: memoryAbi,
          functionName: "getMemoryCountByOwner",
          args: [owner as `0x${string}`],
        })) as bigint;
        if (count === 0n) return { success: false, error: "memory not found after create" };
        const memoryId = await publicClient.readContract({
          address,
          abi: memoryAbi,
          functionName: "getMemoryByOwnerIndex",
          args: [owner as `0x${string}`, count - 1n],
        });

        const memoryIdHex = bytes32ToHex(memoryId);

        return { success: true, data: memoryIdHex };
      } catch (err: any) {
        console.error("createMemory error:", err.message);
        return { success: false, error: parseContractError(err) };
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
        const calldata = encodeFunctionData({
          abi: memoryAbi,
          functionName: "updateMemory",
          args: [memoryId as `0x${string}`, cid, hash as `0x${string}`],
        });
        return await executeContractWrite(request, { to: address, data: calldata });
      } catch (err: any) {
        return { success: false, error: parseContractError(err) };
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
        const calldata = encodeFunctionData({
          abi: memoryAbi,
          functionName: "archiveMemory",
          args: [memoryId as `0x${string}`],
        });
        return await executeContractWrite(request, { to: address, data: calldata });
      } catch (err: any) {
        return { success: false, error: parseContractError(err) };
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
        const calldata = encodeFunctionData({
          abi: memoryAbi,
          functionName: "restoreMemory",
          args: [memoryId as `0x${string}`],
        });
        return await executeContractWrite(request, { to: address, data: calldata });
      } catch (err: any) {
        return { success: false, error: parseContractError(err) };
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
            createdAt: Math.floor(Date.now() / 1000),
            updatedAt: Math.floor(Date.now() / 1000),
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
  const address = getDeployments()["user-registry"].address as `0x${string}`;

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
  const address = getDeployments()["credit-manager"].address as `0x${string}`;

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
  const address = getDeployments()["context-registry"].address as `0x${string}`;

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
        const calldata = encodeFunctionData({
          abi: contextAbi,
          functionName: "linkMemory",
          args: [agentId as `0x${string}`, memoryId as `0x${string}`, priority],
        });
        const confirmed = await executeContractWrite(request, { to: address, data: calldata });
        if (!confirmed.success) {
          const parsed = parseContractError(confirmed.error);
          const msg = parsed.toLowerCase();
          if (msg.includes("already linked")) return { success: false, error: "ALREADY_LINKED" };
          if (msg.includes("memory not found")) return { success: false, error: "MEMORY_NOT_FOUND" };
          if (msg.includes("agent not found")) return { success: false, error: "AGENT_NOT_FOUND" };
          return { success: false, error: parsed };
        }

        const contextId = await publicClient.readContract({
          address,
          abi: contextAbi,
          functionName: "getLink",
          args: [agentId as `0x${string}`, memoryId as `0x${string}`],
        });
        return { success: true, data: bytes32ToHex(contextId) };
      } catch (err: any) {
        const parsed = parseContractError(err);
        const msg = parsed.toLowerCase();
        if (msg.includes("already linked")) return { success: false, error: "ALREADY_LINKED" };
        if (msg.includes("memory not found")) return { success: false, error: "MEMORY_NOT_FOUND" };
        if (msg.includes("agent not found")) return { success: false, error: "AGENT_NOT_FOUND" };
        console.error("linkMemory error:", parsed);
        return { success: false, error: parsed };
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
        const calldata = encodeFunctionData({
          abi: contextAbi,
          functionName: "unlinkMemory",
          args: [agentId as `0x${string}`, memoryId as `0x${string}`],
        });
        const confirmed = await executeContractWrite(request, { to: address, data: calldata });
        if (!confirmed.success) {
          const parsed = parseContractError(confirmed.error);
          const msg = parsed.toLowerCase();
          if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
          return { success: false, error: parsed };
        }
        return { success: true, data: undefined };
      } catch (err: any) {
        const parsed = parseContractError(err);
        const msg = parsed.toLowerCase();
        if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
        return { success: false, error: parsed };
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
        const calldata = encodeFunctionData({
          abi: contextAbi,
          functionName: "changePriority",
          args: [contextId as `0x${string}`, newPriority],
        });
        const confirmed = await executeContractWrite(request, { to: address, data: calldata });
        if (!confirmed.success) {
          const parsed = parseContractError(confirmed.error);
          const msg = parsed.toLowerCase();
          if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
          if (msg.includes("link not active")) return { success: false, error: "LINK_NOT_ACTIVE" };
          return { success: false, error: parsed };
        }
        return { success: true, data: undefined };
      } catch (err: any) {
        const parsed = parseContractError(err);
        const msg = parsed.toLowerCase();
        if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
        if (msg.includes("link not active")) return { success: false, error: "LINK_NOT_ACTIVE" };
        return { success: false, error: parsed };
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
        const calldata = encodeFunctionData({
          abi: contextAbi,
          functionName: "disableLink",
          args: [contextId as `0x${string}`],
        });
        const confirmed = await executeContractWrite(request, { to: address, data: calldata });
        if (!confirmed.success) {
          const parsed = parseContractError(confirmed.error);
          const msg = parsed.toLowerCase();
          if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
          if (msg.includes("already disabled")) return { success: false, error: "ALREADY_DISABLED" };
          return { success: false, error: parsed };
        }
        return { success: true, data: undefined };
      } catch (err: any) {
        const parsed = parseContractError(err);
        const msg = parsed.toLowerCase();
        if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
        if (msg.includes("already disabled")) return { success: false, error: "ALREADY_DISABLED" };
        return { success: false, error: parsed };
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
        const calldata = encodeFunctionData({
          abi: contextAbi,
          functionName: "enableLink",
          args: [contextId as `0x${string}`],
        });
        const confirmed = await executeContractWrite(request, { to: address, data: calldata });
        if (!confirmed.success) {
          const parsed = parseContractError(confirmed.error);
          const msg = parsed.toLowerCase();
          if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
          if (msg.includes("already enabled")) return { success: false, error: "ALREADY_ENABLED" };
          return { success: false, error: parsed };
        }
        return { success: true, data: undefined };
      } catch (err: any) {
        const parsed = parseContractError(err);
        const msg = parsed.toLowerCase();
        if (msg.includes("link not found")) return { success: false, error: "LINK_NOT_FOUND" };
        if (msg.includes("already enabled")) return { success: false, error: "ALREADY_ENABLED" };
        return { success: false, error: parsed };
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
  const address = getDeployments()["chat-registry"].address as `0x${string}`;

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
        const calldata = encodeFunctionData({
          abi: chatAbi,
          functionName: "createChat",
          args: [name, cid, hash as `0x${string}`],
        });
        const confirmed = await executeContractWrite(request, { to: address, data: calldata });
        if (!confirmed.success) return { success: false, error: confirmed.error };

        // Read the new chat ID from this owner's count
        const count = (await publicClient.readContract({
          address,
          abi: chatAbi,
          functionName: "getChatCountByOwner",
          args: [owner as `0x${string}`],
        })) as bigint;
        if (count === 0n) return { success: false, error: "chat not found after create" };
        const chatId = await publicClient.readContract({
          address,
          abi: chatAbi,
          functionName: "getChatByOwnerIndex",
          args: [owner as `0x${string}`, count - 1n],
        });

        const chatIdHex = bytes32ToHex(chatId);

        return { success: true, data: chatIdHex };
      } catch (err: any) {
        console.error("createChat error:", err.message);
        return { success: false, error: parseContractError(err) };
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
        const calldata = encodeFunctionData({
          abi: chatAbi,
          functionName: "updateChat",
          args: [chatId as `0x${string}`, cid, hash as `0x${string}`, name],
        });
        return await executeContractWrite(request, { to: address, data: calldata });
      } catch (err: any) {
        return { success: false, error: parseContractError(err) };
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
        const calldata = encodeFunctionData({
          abi: chatAbi,
          functionName: "archiveChat",
          args: [chatId as `0x${string}`],
        });
        return await executeContractWrite(request, { to: address, data: calldata });
      } catch (err: any) {
        return { success: false, error: parseContractError(err) };
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
  const address = getDeployments()["audit-registry"].address as `0x${string}`;

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


// ══════════════════════════════════════════════════════════════════════════
// UserOp-based adapters (production path)
//
// The user owns a SimpleAccount whose owner is their session key. The backend
// signs UserOperations with that session key (stored encrypted in Redis) and
// submits them to the bundler. Gas is paid by the user's smart account.
// ══════════════════════════════════════════════════════════════════════════

export interface UserOpConfig {
  chain: typeof targetChain;
  rpcUrl: string;
  bundlerUrl: string;
  entryPointAddress: Hex;
  factoryAddress: Hex;
  sessionKeyPrivateKey: Hex;
}

/** EntryPoint v0.6 canonical on Sepolia/One; on Nitro use the locally deployed one. */
function getEntryPointAddress(): Hex {
  return (process.env.ENTRY_POINT_ADDRESS || "0x5FF137D4b0FDCD49DcA30c7CF57C578A026d2789") as Hex;
}

function getFactoryAddress(): Hex {
  const f = process.env.FACTORY_ADDRESS;
  if (!f) throw new Error("FACTORY_ADDRESS is required to use the production (UserOp) adapters");
  return f as Hex;
}

function getBundlerUrl(): string {
  return process.env.BUNDLER_URL || "http://localhost:4337";
}

function userOpConfig(sessionKeyPrivateKey: Hex): UserOpConfig {
  return {
    chain: targetChain,
    rpcUrl: RPC_URL,
    bundlerUrl: getBundlerUrl(),
    entryPointAddress: getEntryPointAddress(),
    factoryAddress: getFactoryAddress(),
    sessionKeyPrivateKey,
  };
}

/** Resolves the user's smart account (owner = session key) for UserOp writes. */
async function resolveSmartAccount(config: UserOpConfig): Promise<Hex> {
  const sessionAccount = privateKeyToAccount(config.sessionKeyPrivateKey);
  return getSmartAccountAddress(publicClient, config.factoryAddress, sessionAccount.address);
}

/** Resolves the user's smart account (owner = session key) and sends a UserOp. */
async function sendUserOp(config: UserOpConfig, target: Hex, calldata: Hex, value = 0n): Promise<void> {
  const sessionAccount = privateKeyToAccount(config.sessionKeyPrivateKey);
  const smartAccount = await getSmartAccountAddress(publicClient, config.factoryAddress, sessionAccount.address);
  const deployed = await isSmartAccountDeployed(publicClient, smartAccount);
  const initCode = deployed ? "0x" : buildInitCode(config.factoryAddress, sessionAccount.address);

  const { userOpHash } = await buildAndSendUserOp({
    target,
    calldata,
    value,
    sessionKeyPrivateKey: config.sessionKeyPrivateKey,
    smartAccount,
    entryPointAddress: config.entryPointAddress,
    chain: config.chain,
    rpcUrl: config.rpcUrl,
    bundlerUrl: config.bundlerUrl,
    initCode: initCode as Hex,
  });
  await waitForUserOp(userOpHash, config.bundlerUrl);
}

export interface UserOpAdapterFactory {
  createUserRegistryUserOpAdapter(sessionKeyPrivateKey: Hex): UserRegistryContract;
  createMemoryRegistryUserOpAdapter(sessionKeyPrivateKey: Hex): MemoryRegistryContract;
  createAgentRegistryUserOpAdapter(sessionKeyPrivateKey: Hex): AgentRegistryContract;
  createChatRegistryUserOpAdapter(sessionKeyPrivateKey: Hex): ChatRegistryContract;
  createContextRegistryUserOpAdapter(sessionKeyPrivateKey: Hex): ContextRegistryContract;
  createCreditManagerUserOpAdapter(sessionKeyPrivateKey: Hex): CreditManagerContract;
  createAuditRegistryUserOpAdapter(sessionKeyPrivateKey: Hex): AuditRegistryContract;
}

export function createUserOpAdapters(): UserOpAdapterFactory {
  return {
    createUserRegistryUserOpAdapter(sessionKeyPrivateKey) {
      const config = userOpConfig(sessionKeyPrivateKey);
      const address = getDeployments()["user-registry"].address as Hex;
      return {
        async registerUser(_owner, username) {
          try {
            const calldata = encodeFunctionData({ abi: userAbi, functionName: "registerUser", args: [username] });
            await sendUserOp(config, address, calldata);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async updateUsername(_owner, username) {
          try {
            const calldata = encodeFunctionData({ abi: userAbi, functionName: "updateUsername", args: [username] });
            await sendUserOp(config, address, calldata);
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
      const config = userOpConfig(sessionKeyPrivateKey);
      const address = getDeployments()["memory-registry"].address as Hex;
      return {
        async createMemory(_owner, name, _description, cid, hash, memoryType, visibility) {
          try {
            const calldata = encodeFunctionData({
              abi: memoryAbi,
              functionName: "createMemory",
              args: [name, cid, hash as `0x${string}`, memoryType, visibility],
            });
            await sendUserOp(config, address, calldata);
            // The UserOp executes from the SMART ACCOUNT (msg.sender), not the
            // connected wallet. Resolve the smart account so we read the right index.
            const smartAccount = await resolveSmartAccount(config);
            const count = (await publicClient.readContract({
              address, abi: memoryAbi, functionName: "getMemoryCountByOwner", args: [smartAccount],
            })) as bigint;
            if (count === 0n) return { success: false, error: "memory not found after create" };
            const memoryId = await publicClient.readContract({
              address,
              abi: memoryAbi,
              functionName: "getMemoryByOwnerIndex",
              args: [smartAccount, count - 1n],
            });
            return { success: true, data: bytes32ToHex(memoryId) };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async updateMemory(_owner, memoryId, cid, hash) {
          try {
            const calldata = encodeFunctionData({
              abi: memoryAbi,
              functionName: "updateMemory",
              args: [memoryId as `0x${string}`, cid, hash as `0x${string}`],
            });
            await sendUserOp(config, address, calldata);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async archiveMemory(_owner, memoryId) {
          try {
            const calldata = encodeFunctionData({ abi: memoryAbi, functionName: "archiveMemory", args: [memoryId as `0x${string}`] });
            await sendUserOp(config, address, calldata);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async restoreMemory(_owner, memoryId) {
          try {
            const calldata = encodeFunctionData({ abi: memoryAbi, functionName: "restoreMemory", args: [memoryId as `0x${string}`] });
            await sendUserOp(config, address, calldata);
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
      const config = userOpConfig(sessionKeyPrivateKey);
      const address = getDeployments()["agent-registry"].address as Hex;
      return {
        async createAgent(_owner, name, _description, cid, hash) {
          try {
            const calldata = encodeFunctionData({
              abi: agentAbi,
              functionName: "createAgent",
              args: [name, cid, hash as `0x${string}`],
            });
            await sendUserOp(config, address, calldata);
            const smartAccount = await resolveSmartAccount(config);
            const count = (await publicClient.readContract({
              address, abi: agentAbi, functionName: "getAgentCountByOwner", args: [smartAccount],
            })) as bigint;
            if (count === 0n) return { success: false, error: "agent not found after create" };
            const agentId = await publicClient.readContract({
              address,
              abi: agentAbi,
              functionName: "getAgentByOwnerIndex",
              args: [smartAccount, count - 1n],
            });
            return { success: true, data: bytes32ToHex(agentId) };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async updateAgent(_owner, agentId, cid, hash) {
          try {
            const calldata = encodeFunctionData({
              abi: agentAbi,
              functionName: "updateAgent",
              args: [agentId as `0x${string}`, cid, hash as `0x${string}`],
            });
            await sendUserOp(config, address, calldata);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async archiveAgent(_owner, agentId) {
          try {
            const calldata = encodeFunctionData({ abi: agentAbi, functionName: "archiveAgent", args: [agentId as `0x${string}`] });
            await sendUserOp(config, address, calldata);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async restoreAgent(_owner, agentId) {
          try {
            const calldata = encodeFunctionData({ abi: agentAbi, functionName: "restoreAgent", args: [agentId as `0x${string}`] });
            await sendUserOp(config, address, calldata);
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
      const config = userOpConfig(sessionKeyPrivateKey);
      const address = getDeployments()["chat-registry"].address as Hex;
      return {
        async createChat(_owner, name, cid, hash) {
          try {
            const calldata = encodeFunctionData({
              abi: chatAbi,
              functionName: "createChat",
              args: [name, cid, hash as `0x${string}`],
            });
            await sendUserOp(config, address, calldata);
            const smartAccount = await resolveSmartAccount(config);
            const count = (await publicClient.readContract({
              address, abi: chatAbi, functionName: "getChatCountByOwner", args: [smartAccount],
            })) as bigint;
            if (count === 0n) return { success: false, error: "chat not found after create" };
            const chatId = await publicClient.readContract({
              address,
              abi: chatAbi,
              functionName: "getChatByOwnerIndex",
              args: [smartAccount, count - 1n],
            });
            return { success: true, data: bytes32ToHex(chatId) };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async updateChat(_owner, chatId, cid, hash, name) {
          try {
            const calldata = encodeFunctionData({
              abi: chatAbi,
              functionName: "updateChat",
              args: [chatId as `0x${string}`, cid, hash as `0x${string}`, name],
            });
            await sendUserOp(config, address, calldata);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async archiveChat(_owner, chatId) {
          try {
            const calldata = encodeFunctionData({ abi: chatAbi, functionName: "archiveChat", args: [chatId as `0x${string}`] });
            await sendUserOp(config, address, calldata);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async restoreChat(_owner, chatId) {
          try {
            const calldata = encodeFunctionData({ abi: chatAbi, functionName: "restoreChat", args: [chatId as `0x${string}`] });
            await sendUserOp(config, address, calldata);
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
      const config = userOpConfig(sessionKeyPrivateKey);
      const address = getDeployments()["context-registry"].address as Hex;
      return {
        async linkMemory(_owner, agentId, memoryId, priority) {
          try {
            const calldata = encodeFunctionData({
              abi: contextAbi,
              functionName: "linkMemory",
              args: [agentId as `0x${string}`, memoryId as `0x${string}`, priority],
            });
            await sendUserOp(config, address, calldata);
            const contextId = await publicClient.readContract({
              address,
              abi: contextAbi,
              functionName: "getLink",
              args: [agentId as `0x${string}`, memoryId as `0x${string}`],
            });
            return { success: true, data: bytes32ToHex(contextId) };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async unlinkMemory(_owner, agentId, memoryId) {
          try {
            const calldata = encodeFunctionData({
              abi: contextAbi,
              functionName: "unlinkMemory",
              args: [agentId as `0x${string}`, memoryId as `0x${string}`],
            });
            await sendUserOp(config, address, calldata);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async changePriority(_owner, contextId, newPriority) {
          try {
            const calldata = encodeFunctionData({
              abi: contextAbi,
              functionName: "changePriority",
              args: [contextId as `0x${string}`, newPriority],
            });
            await sendUserOp(config, address, calldata);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async disableLink(_owner, contextId) {
          try {
            const calldata = encodeFunctionData({ abi: contextAbi, functionName: "disableLink", args: [contextId as `0x${string}`] });
            await sendUserOp(config, address, calldata);
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async enableLink(_owner, contextId) {
          try {
            const calldata = encodeFunctionData({ abi: contextAbi, functionName: "enableLink", args: [contextId as `0x${string}`] });
            await sendUserOp(config, address, calldata);
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
      const config = userOpConfig(sessionKeyPrivateKey);
      const address = getDeployments()["credit-manager"].address as Hex;
      return {
        async buyCredits(_user, amount, valueWei) {
          try {
            const calldata = encodeFunctionData({
              abi: creditAbi,
              functionName: "buyCredits",
              args: [BigInt(amount)],
            });
            await sendUserOp(config, address, calldata, BigInt(valueWei));
            return { success: true };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async balanceOf(user) { return createCreditManagerAdapter().balanceOf(user); },
        async hasSufficientCredits(user, amount) { return createCreditManagerAdapter().hasSufficientCredits(user, amount); },
        async getFees() { return createCreditManagerAdapter().getFees(); },
        async getPricing() { return createCreditManagerAdapter().getPricing(); },
      };
    },

    createAuditRegistryUserOpAdapter(sessionKeyPrivateKey) {
      const config = userOpConfig(sessionKeyPrivateKey);
      const address = getDeployments()["audit-registry"].address as Hex;
      return {
        async recordAudit(_actor, entityType, entityId, action) {
          try {
            const calldata = encodeFunctionData({
              abi: auditAbi,
              functionName: "recordAudit",
              args: [_actor as `0x${string}`, entityType, entityId as `0x${string}`, action],
            });
            await sendUserOp(config, address, calldata);
            return { success: true, data: "0x" + "00".repeat(32) };
          } catch (err: any) {
            return { success: false, error: err.message };
          }
        },
        async getAuditEvent(eventId) { return createAuditRegistryAdapter().getAuditEvent(eventId); },
        async getTotalEvents() { return createAuditRegistryAdapter().getTotalEvents(); },
      };
    },
  };
}

// ── Production adapters: resolve the user's session key per call ───────────

async function resolveSessionKey(store: SessionKeyStore, owner: string, operation: string): Promise<Hex> {
  const keys = await store.list(owner);
  const now = Math.floor(Date.now() / 1000);
  const key = keys.find(k => k.expiry > now && k.privateKeyEncrypted && k.scopes.includes(operation));
  if (!key?.privateKeyEncrypted) {
    throw new Error(
      `NO_ACTIVE_SESSION_KEY: ${owner} has no active session key for "${operation}". ` +
      "Generate one via POST /session-keys/generate first.",
    );
  }
  return decryptPrivateKey(key.privateKeyEncrypted) as Hex;
}

interface ProductionAdapterSpec<T> {
  store: SessionKeyStore;
  /** Methods that must be executed through the user's smart account (UserOp). */
  writeMethods: string[];
  buildWrite: (sessionKeyPrivateKey: Hex) => T;
  buildRead: () => T;
}

/**
 * Wraps a registry adapter so that write methods resolve the caller's session
 * key (first argument = owner address) and go through the bundler, while read
 * methods hit the chain directly. Type-safe: the proxy claims type T.
 */
function createProductionAdapter<T extends object>(spec: ProductionAdapterSpec<T>): T {
  return new Proxy({} as T, {
    get(_, prop) {
      const method = String(prop);
      return async (...args: unknown[]) => {
        if (spec.writeMethods.includes(method)) {
          const owner = args[0] as string;
          const pk = await resolveSessionKey(spec.store, owner, method);
          const writeAdapter = spec.buildWrite(pk);
          const fn = (writeAdapter as unknown as Record<string, unknown>)[method] as Function;
          return fn.apply(writeAdapter, args);
        }
        const readAdapter = spec.buildRead();
        const fn = (readAdapter as unknown as Record<string, unknown>)[method] as Function;
        return fn.apply(readAdapter, args);
      };
    },
  });
}

export interface ProductionAdapters {
  userRegistry: UserRegistryContract;
  memoryRegistry: MemoryRegistryContract;
  agentRegistry: AgentRegistryContract;
  chatRegistry: ChatRegistryContract;
  contextRegistry: ContextRegistryContract;
  creditManager: CreditManagerContract;
  auditRegistry: AuditRegistryContract;
}

/**
 * Production adapters: every write is a UserOp signed with the owner's session
 * key and executed through the owner's smart account (gas paid by the user).
 */
export function createProductionAdapters(params: { sessionKeyStore: SessionKeyStore }): ProductionAdapters {
  const { sessionKeyStore } = params;
  const factory = createUserOpAdapters();

  return {
    userRegistry: createProductionAdapter({
      store: sessionKeyStore,
      writeMethods: ["registerUser", "updateUsername"],
      buildWrite: pk => factory.createUserRegistryUserOpAdapter(pk),
      buildRead: () => createUserRegistryAdapter(),
    }),
    memoryRegistry: createProductionAdapter({
      store: sessionKeyStore,
      writeMethods: ["createMemory", "updateMemory", "archiveMemory", "restoreMemory"],
      buildWrite: pk => factory.createMemoryRegistryUserOpAdapter(pk),
      buildRead: () => createMemoryRegistryAdapter(),
    }),
    agentRegistry: createProductionAdapter({
      store: sessionKeyStore,
      writeMethods: ["createAgent", "updateAgent", "archiveAgent", "restoreAgent"],
      buildWrite: pk => factory.createAgentRegistryUserOpAdapter(pk),
      buildRead: () => createAgentRegistryAdapter(),
    }),
    chatRegistry: createProductionAdapter({
      store: sessionKeyStore,
      writeMethods: ["createChat", "updateChat", "archiveChat", "restoreChat"],
      buildWrite: pk => factory.createChatRegistryUserOpAdapter(pk),
      buildRead: () => createChatRegistryAdapter(),
    }),
    contextRegistry: createProductionAdapter({
      store: sessionKeyStore,
      writeMethods: ["linkMemory", "unlinkMemory", "changePriority", "disableLink", "enableLink"],
      buildWrite: pk => factory.createContextRegistryUserOpAdapter(pk),
      buildRead: () => createContextRegistryAdapter(),
    }),
    creditManager: createProductionAdapter({
      store: sessionKeyStore,
      writeMethods: ["buyCredits"],
      buildWrite: pk => factory.createCreditManagerUserOpAdapter(pk),
      buildRead: () => createCreditManagerAdapter(),
    }),
    auditRegistry: createProductionAdapter({
      store: sessionKeyStore,
      writeMethods: ["recordAudit"],
      buildWrite: pk => factory.createAuditRegistryUserOpAdapter(pk),
      buildRead: () => createAuditRegistryAdapter(),
    }),
  };
}
