import { type Hex, type PublicClient } from "viem";

const SIMPLE_ACCOUNT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS as Hex;

// SimpleAccountFactory v0.6 — getAddress(owner, salt) is the source of truth.
const SIMPLE_ACCOUNT_FACTORY_ABI = [
  {
    name: "getAddress",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

/**
 * Counterfactual address of the user's SimpleAccount.
 * Computed ON-CHAIN via factory.getAddress (a local CREATE2 guess does NOT
 * match — it must include the ERC1967Proxy creation code + init data).
 *
 * For production (Option B) `owner` is the SESSION KEY address; the session key
 * is the account owner and signs UserOperations on the user's behalf.
 */
export async function getSmartAccountAddress(
  publicClient: PublicClient,
  owner: Hex,
  salt: bigint = 0n,
): Promise<Hex> {
  if (!SIMPLE_ACCOUNT_FACTORY_ADDRESS) {
    throw new Error("NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS not set");
  }
  const addr = await publicClient.readContract({
    address: SIMPLE_ACCOUNT_FACTORY_ADDRESS,
    abi: SIMPLE_ACCOUNT_FACTORY_ABI,
    functionName: "getAddress",
    args: [owner, salt],
  });
  return addr as Hex;
}

export { SIMPLE_ACCOUNT_FACTORY_ABI, SIMPLE_ACCOUNT_FACTORY_ADDRESS };
