import { type Hex, encodeFunctionData } from "viem";

// Structural client type — accepts any viem public client (readContract/getCode),
// so we don't fight viem's strict chain-union generics.
export interface SmartAccountClient {
  readContract(...args: any[]): Promise<any>;
  getCode(...args: any[]): Promise<any>;
}

// SimpleAccountFactory v0.6 — createAccount(owner, salt) + getAddress(owner, salt).
const FACTORY_ABI = [
  {
    type: "function",
    name: "getAddress",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "createAccount",
    stateMutability: "nonpayable",
    inputs: [
      { name: "owner", type: "address" },
      { name: "salt", type: "uint256" },
    ],
    outputs: [{ name: "ret", type: "address" }],
  },
] as const;

/**
 * Counterfactual address of the user's SimpleAccount. Computed on-chain via
 * factory.getAddress (NOT a local CREATE2 guess — matches the real address).
 */
export async function getSmartAccountAddress(
  publicClient: SmartAccountClient,
  factoryAddress: Hex,
  owner: Hex,
  salt = 0n,
): Promise<Hex> {
  const addr = await publicClient.readContract({
    address: factoryAddress,
    abi: FACTORY_ABI,
    functionName: "getAddress",
    args: [owner, salt],
  });
  return addr as Hex;
}

/** initCode = factory address + createAccount(owner, salt) — used on first UserOp. */
export function buildInitCode(factoryAddress: Hex, owner: Hex, salt = 0n): Hex {
  const createData = encodeFunctionData({
    abi: FACTORY_ABI,
    functionName: "createAccount",
    args: [owner, salt],
  });
  return (factoryAddress + createData.slice(2)) as Hex;
}

/** True if the smart account already has code deployed on-chain. */
export async function isSmartAccountDeployed(
  publicClient: SmartAccountClient,
  smartAccount: Hex,
): Promise<boolean> {
  const code = await publicClient.getCode({ address: smartAccount });
  return code !== "0x" && code !== null && code !== undefined;
}
