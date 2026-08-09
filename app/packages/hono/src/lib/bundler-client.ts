import { createPublicClient, createWalletClient, http, type Hex, type Chain, type PublicClient, type WalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createBundlerClient, entryPoint07Address, entryPoint07Abi } from "viem/account-abstraction";

const RPC_URL = process.env.RPC_URL || "http://localhost:8547";
const BUNDLER_URL = process.env.BUNDLER_URL || "http://localhost:4337";
const PRIVATE_KEY = process.env.DEV_PRIVATE_KEY as Hex;

export const nitroChain: Chain = {
  id: 412346,
  name: "Nitro DevNode",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
};

export const publicClient: PublicClient = createPublicClient({
  chain: nitroChain,
  transport: http(RPC_URL),
});

export const bundlerClient = createBundlerClient({
  chain: nitroChain,
  transport: http(BUNDLER_URL),
});

export function getWalletClient(privateKey?: Hex): WalletClient {
  const key = privateKey || PRIVATE_KEY;
  const account = privateKeyToAccount(key);
  return createWalletClient({ account, chain: nitroChain, transport: http(RPC_URL) });
}

export const entryPointAddress = entryPoint07Address;
export const entryPointAbi = entryPoint07Abi;
