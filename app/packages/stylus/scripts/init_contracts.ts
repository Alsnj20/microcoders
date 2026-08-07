import * as fs from "fs";
import * as path from "path";
import { http, type Chain, createPublicClient, createWalletClient, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumNitro } from "../../nextjs/utils/scaffold-stylus/supportedChains";

const chain = arbitrumNitro as Chain;

const DEPLOYED_CONTRACTS_PATH = path.resolve(__dirname, "../../nextjs/contracts/deployedContracts.ts");

// ── ABI subsets needed for initialization and authorization ─────────────────

const INITIALIZE_ABI = parseAbi([
  "function initialize()",
  "function initialize(address creditManager, address userRegistry)",
  "function initialize(address memoryRegistry, address agentRegistry, address creditManager)",
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
  contextRegistry: `0x${string}`;
  auditRegistry: `0x${string}`;
}

// ── Read deployed contracts ────────────────────────────────────────────────

function getAddresses(): ContractAddresses | null {
  if (!fs.existsSync(DEPLOYED_CONTRACTS_PATH)) {
    return null;
  }

  const content = fs.readFileSync(DEPLOYED_CONTRACTS_PATH, "utf8");
  const match = content.match(/const deployedContracts = ([\s\S]*?) as const;/);
  if (!match) return null;

  // eslint-disable-next-line no-eval
  const contracts = eval("(" + match[1] + ")");
  const chainId = chain.id.toString();
  const chainContracts = contracts[chainId];
  if (!chainContracts) return null;

  const get = (name: string) => chainContracts[name]?.address as `0x${string}` | undefined;

  const creditManager = get("CreditManager");
  const userRegistry = get("UserRegistry");
  const memoryRegistry = get("MemoryRegistry");
  const agentRegistry = get("AgentRegistry");
  const contextRegistry = get("ContextRegistry");
  const auditRegistry = get("AuditRegistry");

  if (!creditManager || !userRegistry || !memoryRegistry || !agentRegistry || !contextRegistry || !auditRegistry) {
    return null;
  }

  return { creditManager, userRegistry, memoryRegistry, agentRegistry, contextRegistry, auditRegistry };
}

// ── Initialize contracts ───────────────────────────────────────────────────

async function initializeContracts(
  walletClient: ReturnType<typeof createWalletClient>,
  account: ReturnType<typeof privateKeyToAccount>,
  addresses: ContractAddresses,
) {
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  console.log("\n🔧 Initializing contracts...");

  // 1. CreditManager.initialize()
  console.log("  → CreditManager.initialize()");
  const { request: cmInit } = await publicClient.simulateContract({
    account,
    address: addresses.creditManager,
    abi: INITIALIZE_ABI,
    functionName: "initialize",
  });
  await walletClient.writeContract(cmInit);

  // 2. UserRegistry.initialize()
  console.log("  → UserRegistry.initialize()");
  const { request: urInit } = await publicClient.simulateContract({
    account,
    address: addresses.userRegistry,
    abi: INITIALIZE_ABI,
    functionName: "initialize",
  });
  await walletClient.writeContract(urInit);

  // 3. MemoryRegistry.initialize(creditManager, userRegistry)
  console.log("  → MemoryRegistry.initialize(creditManager, userRegistry)");
  const { request: mrInit } = await publicClient.simulateContract({
    account,
    address: addresses.memoryRegistry,
    abi: INITIALIZE_ABI,
    functionName: "initialize",
    args: [addresses.creditManager, addresses.userRegistry],
  });
  await walletClient.writeContract(mrInit);

  // 4. AgentRegistry.initialize(creditManager, userRegistry)
  console.log("  → AgentRegistry.initialize(creditManager, userRegistry)");
  const { request: arInit } = await publicClient.simulateContract({
    account,
    address: addresses.agentRegistry,
    abi: INITIALIZE_ABI,
    functionName: "initialize",
    args: [addresses.creditManager, addresses.userRegistry],
  });
  await walletClient.writeContract(arInit);

  // 5. ContextRegistry.initialize(memoryRegistry, agentRegistry, creditManager)
  console.log("  → ContextRegistry.initialize(memoryRegistry, agentRegistry, creditManager)");
  const { request: ctxInit } = await publicClient.simulateContract({
    account,
    address: addresses.contextRegistry,
    abi: INITIALIZE_ABI,
    functionName: "initialize",
    args: [addresses.memoryRegistry, addresses.agentRegistry, addresses.creditManager],
  });
  await walletClient.writeContract(ctxInit);

  // 6. AuditRegistry.initialize()
  console.log("  → AuditRegistry.initialize()");
  const { request: auditInit } = await publicClient.simulateContract({
    account,
    address: addresses.auditRegistry,
    abi: INITIALIZE_ABI,
    functionName: "initialize",
  });
  await walletClient.writeContract(auditInit);

  console.log("✅ All contracts initialized\n");
}

// ── Authorize cross-contract calls ─────────────────────────────────────────

async function authorizeContracts(
  walletClient: ReturnType<typeof createWalletClient>,
  account: ReturnType<typeof privateKeyToAccount>,
  addresses: ContractAddresses,
) {
  const publicClient = createPublicClient({
    chain,
    transport: http(),
  });

  console.log("🔗 Authorizing cross-contract calls...");

  // CreditManager.authorizeConsumer — allow MemoryRegistry, AgentRegistry, ContextRegistry to consume credits
  for (const [label, addr] of [
    ["MemoryRegistry", addresses.memoryRegistry],
    ["AgentRegistry", addresses.agentRegistry],
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

  // UserRegistry.authorizeUpdater — allow MemoryRegistry, AgentRegistry to update user stats
  for (const [label, addr] of [
    ["MemoryRegistry", addresses.memoryRegistry],
    ["AgentRegistry", addresses.agentRegistry],
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

export default async function initContracts(): Promise<void> {
  const addresses = getAddresses();
  if (!addresses) {
    console.warn("⚠️  Could not read contract addresses from deployedContracts.ts — skipping init");
    return;
  }

  const pk = (process.env["PRIVATE_KEY_NITRO"] || process.env["PRIVATE_KEY"] || "").replace("0x", "");
  if (!pk) {
    throw new Error("No private key found in .env (PRIVATE_KEY_NITRO or PRIVATE_KEY)");
  }

  const account = privateKeyToAccount(`0x${pk}`);
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  console.log(`🔑 Using account: ${account.address}`);

  await initializeContracts(walletClient, account, addresses);
  await authorizeContracts(walletClient, account, addresses);
}
