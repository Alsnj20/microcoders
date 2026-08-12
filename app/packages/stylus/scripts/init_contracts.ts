import * as fs from "fs";
import * as path from "path";
import { http, type Chain, createPublicClient, createWalletClient, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  getChain,
  getPricePerCreditFor,
  getPrivateKey,
  getRpcUrlFromChain,
  getTreasuryFor,
  isTestnetFor,
} from "./utils/network";

const DEPLOYED_CONTRACTS_PATH = path.resolve(__dirname, "../../nextjs/contracts/deployedContracts.ts");

// ── ABI subsets needed for initialization and authorization ─────────────────

const INITIALIZE_ABI = parseAbi([
  "function initialize()",
  "function initialize(address creditManager, address userRegistry)",
  "function initialize(address memoryRegistry, address agentRegistry, address creditManager)",
]);

const INITIALIZE_NETWORK_ABI = parseAbi([
  "function initializeNetwork(bool isTestnet, address treasury, uint256 pricePerCredit)",
]);

const AUTHORIZE_ABI = parseAbi([
  "function authorizeConsumer(address consumer)",
  "function authorizeUpdater(address updater)",
]);

// ── Types ──────────────────────────────────────────────────────────────────

interface ContractAddresses {
  creditManager: `0x${string}`;
  userRegistry: `0x${string}`;
  memoryRegistry: `0x${string}`;
  agentRegistry: `0x${string}`;
  chatRegistry: `0x${string}`;
  contextRegistry: `0x${string}`;
  auditRegistry: `0x${string}`;
}

// ── Read deployed contracts ────────────────────────────────────────────────

function getAddresses(chain: Chain): ContractAddresses | null {
  if (!fs.existsSync(DEPLOYED_CONTRACTS_PATH)) {
    return null;
  }

  const content = fs.readFileSync(DEPLOYED_CONTRACTS_PATH, "utf8");
  const constAnchor = content.indexOf(" as const;");
  const constStart = content.indexOf("const deployedContracts = ");
  if (constAnchor < 0 || constStart < 0) return null;
  // The object is emitted by JSON.stringify, so the text between `= ` and ` as const;` is pure JSON.
  let contracts: Record<string, unknown>;
  try {
    contracts = JSON.parse(
      content.slice(constStart + "const deployedContracts = ".length, constAnchor),
    );
  } catch {
    return null;
  }
  const chainId = chain.id.toString();
  const chainContracts = contracts[chainId] as
    | Record<string, { address: string }>
    | undefined;
  if (!chainContracts) return null;

  const get = (name: string) => chainContracts[name]?.address as `0x${string}` | undefined;

  const creditManager = get("CreditManager");
  const userRegistry = get("UserRegistry");
  const memoryRegistry = get("MemoryRegistry");
  const agentRegistry = get("AgentRegistry");
  const chatRegistry = get("ChatRegistry");
  const contextRegistry = get("ContextRegistry");
  const auditRegistry = get("AuditRegistry");

  if (!creditManager || !userRegistry || !memoryRegistry || !agentRegistry || !chatRegistry || !contextRegistry || !auditRegistry) {
    return null;
  }

  return { creditManager, userRegistry, memoryRegistry, agentRegistry, chatRegistry, contextRegistry, auditRegistry };
}

// ── Initialize contracts ───────────────────────────────────────────────────

async function initializeContracts(
  walletClient: ReturnType<typeof createWalletClient>,
  account: ReturnType<typeof privateKeyToAccount>,
  publicClient: ReturnType<typeof createPublicClient>,
  addresses: ContractAddresses,
  network: string,
) {
  console.log("\n🔧 Initializing contracts...");

  // Helper: try to initialize, skip if already initialized
  const tryInit = async (name: string, fn: () => Promise<any>) => {
    try {
      await fn();
      console.log(`  ✅ ${name} initialized`);
    } catch (e: any) {
      const msg = e.shortMessage || e.message || "";
      if (msg.includes("already initialized")) {
        console.log(`  ⏭️  ${name} already initialized, skipping`);
      } else {
        console.log(`  ❌ ${name} failed: ${msg.slice(0, 100)}`);
      }
    }
  };

  // 1. CreditManager.initialize() + initializeNetwork()
  await tryInit("CreditManager", async () => {
    const { request } = await publicClient.simulateContract({
      account, address: addresses.creditManager, abi: INITIALIZE_ABI, functionName: "initialize",
    });
    await walletClient.writeContract(request);
  });

  const treasury = (getTreasuryFor(network) || account.address) as `0x${string}`;
  const isTestnet = isTestnetFor(network);
  const pricePerCredit = BigInt(getPricePerCreditFor(network));
  await tryInit("CreditManager.initializeNetwork", async () => {
    const { request } = await publicClient.simulateContract({
      account,
      address: addresses.creditManager,
      abi: INITIALIZE_NETWORK_ABI,
      functionName: "initializeNetwork",
      args: [isTestnet, treasury, pricePerCredit],
    });
    await walletClient.writeContract(request);
  });

  // 2. UserRegistry.initialize()
  await tryInit("UserRegistry", async () => {
    const { request } = await publicClient.simulateContract({
      account, address: addresses.userRegistry, abi: INITIALIZE_ABI, functionName: "initialize",
    });
    await walletClient.writeContract(request);
  });

  // 3. MemoryRegistry.initialize(creditManager, userRegistry)
  await tryInit("MemoryRegistry", async () => {
    const { request } = await publicClient.simulateContract({
      account, address: addresses.memoryRegistry, abi: INITIALIZE_ABI, functionName: "initialize",
      args: [addresses.creditManager, addresses.userRegistry],
    });
    await walletClient.writeContract(request);
  });

  // 4. AgentRegistry.initialize(creditManager, userRegistry)
  await tryInit("AgentRegistry", async () => {
    const { request } = await publicClient.simulateContract({
      account, address: addresses.agentRegistry, abi: INITIALIZE_ABI, functionName: "initialize",
      args: [addresses.creditManager, addresses.userRegistry],
    });
    await walletClient.writeContract(request);
  });

  // 5. ChatRegistry.initialize(creditManager, userRegistry)
  await tryInit("ChatRegistry", async () => {
    const { request } = await publicClient.simulateContract({
      account, address: addresses.chatRegistry, abi: INITIALIZE_ABI, functionName: "initialize",
      args: [addresses.creditManager, addresses.userRegistry],
    });
    await walletClient.writeContract(request);
  });

  // 6. ContextRegistry.initialize(memoryRegistry, agentRegistry, creditManager)
  await tryInit("ContextRegistry", async () => {
    const { request } = await publicClient.simulateContract({
      account, address: addresses.contextRegistry, abi: INITIALIZE_ABI, functionName: "initialize",
      args: [addresses.memoryRegistry, addresses.agentRegistry, addresses.creditManager],
    });
    await walletClient.writeContract(request);
  });

  // 7. AuditRegistry.initialize()
  await tryInit("AuditRegistry", async () => {
    const { request } = await publicClient.simulateContract({
      account, address: addresses.auditRegistry, abi: INITIALIZE_ABI, functionName: "initialize",
    });
    await walletClient.writeContract(request);
  });
  console.log("✅ All contracts initialized\n");
}

// ── Authorize cross-contract calls ─────────────────────────────────────────

async function authorizeContracts(
  walletClient: ReturnType<typeof createWalletClient>,
  account: ReturnType<typeof privateKeyToAccount>,
  publicClient: ReturnType<typeof createPublicClient>,
  addresses: ContractAddresses,
) {
  console.log("🔗 Authorizing cross-contract calls...");

  // CreditManager.authorizeConsumer — allow MemoryRegistry, AgentRegistry, ChatRegistry, ContextRegistry to consume credits
  for (const [label, addr] of [
    ["MemoryRegistry", addresses.memoryRegistry],
    ["AgentRegistry", addresses.agentRegistry],
    ["ChatRegistry", addresses.chatRegistry],
    ["ContextRegistry", addresses.contextRegistry],
  ] as const) {
    console.log(`  → CreditManager.authorizeConsumer(${label})`);
    const { request } = await publicClient.simulateContract({
      account,
      address: addresses.creditManager,
      abi: AUTHORIZE_ABI,
      functionName: "authorizeConsumer",
      args: [addr],
    });
    await walletClient.writeContract(request);
  }

  // UserRegistry.authorizeUpdater — allow MemoryRegistry, AgentRegistry, ChatRegistry to update user stats
  for (const [label, addr] of [
    ["MemoryRegistry", addresses.memoryRegistry],
    ["AgentRegistry", addresses.agentRegistry],
    ["ChatRegistry", addresses.chatRegistry],
  ] as const) {
    console.log(`  → UserRegistry.authorizeUpdater(${label})`);
    const { request } = await publicClient.simulateContract({
      account,
      address: addresses.userRegistry,
      abi: AUTHORIZE_ABI,
      functionName: "authorizeUpdater",
      args: [addr],
    });
    await walletClient.writeContract(request);
  }

  console.log("✅ All authorizations complete\n");
}

// ── Main export ────────────────────────────────────────────────────────────

export default async function initContracts(network = "arbitrumNitro"): Promise<void> {
  const chain = getChain(network);
  if (!chain) {
    throw new Error(`Network '${network}' not supported. Run: pnpm init-contracts --network <arbitrumNitro|arbitrumSepolia|arbitrumOne>`);
  }

  const addresses = getAddresses(chain);
  if (!addresses) {
    console.warn(`⚠️  Could not read contract addresses for chain ${chain.id} from deployedContracts.ts — skipping init`);
    return;
  }

  const pk = getPrivateKey(network).replace("0x", "");
  if (!pk) {
    throw new Error(`No private key found for network ${network}`);
  }

  const account = privateKeyToAccount(`0x${pk}`);
  const rpcUrl = getRpcUrlFromChain(chain);
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  console.log(`🔑 Using account: ${account.address} on ${chain.name} (${chain.id})`);
  console.log(`📡 RPC: ${rpcUrl}`);

  await initializeContracts(walletClient, account, publicClient, addresses, network);
  await authorizeContracts(walletClient, account, publicClient, addresses);
}

// ── CLI entry (pnpm init-contracts --network <network>) ────────────────────

if (require.main === module) {
  const args = process.argv;
  const netIndex = args.indexOf("--network");
  const network = netIndex >= 0 && args[netIndex + 1] ? args[netIndex + 1] : "arbitrumNitro";

  initContracts(network)
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Fatal error:", err);
      process.exit(1);
    });
}
