import { createPublicClient, http, type Hex, defineChain } from "viem";
import { arbitrum, arbitrumSepolia } from "viem/chains";
import type { SessionKeyStore } from "../types/session.js";
import { getSmartAccountAddress } from "./smart-account.js";

/**
 * Resolves the user's on-chain identity:
 * - In production (UserOps) all writes execute as the SMART ACCOUNT, so reads must
 *   target the same account or they will return empty/0. The smart account is
 *   derived from the user's ACTIVE session key.
 * - Falls back to the connected wallet when no session key / store is available.
 */
export async function resolveAccountFor(
  sessionKeyStore: SessionKeyStore | undefined,
  wallet: string,
): Promise<Hex> {
  try {
    if (sessionKeyStore) {
      const keys = await sessionKeyStore.list(wallet);
      const now = Math.floor(Date.now() / 1000);
      const active = keys.find((k) => k.expiry > now && k.sessionKeyAddress);
      if (active?.sessionKeyAddress) {
        const rpcUrl = process.env.RPC_URL || "http://localhost:8547";
        const chainId = Number(process.env.CHAIN_ID || 412346);
        const chain =
          chainId === 42161
            ? arbitrum
            : chainId === 421614
              ? arbitrumSepolia
              : defineChain({
                  id: 412346,
                  name: "Nitro DevNode",
                  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                  rpcUrls: { default: { http: [rpcUrl] }, public: { http: [rpcUrl] } },
                });
        const client = createPublicClient({ chain, transport: http(rpcUrl) });
        const factory = process.env.FACTORY_ADDRESS as Hex | undefined;
        if (factory) {
          return await getSmartAccountAddress(client, factory, active.sessionKeyAddress as Hex);
        }
      }
    }
  } catch {
    // fall through to the wallet address
  }
  return wallet as Hex;
}
