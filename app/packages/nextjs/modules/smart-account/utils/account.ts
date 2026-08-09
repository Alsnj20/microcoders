import { type Hex, encodePacked, keccak256, toBytes, getAddress } from "viem";

const SIMPLE_ACCOUNT_FACTORY_ADDRESS = process.env.NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS as Hex;

const CREATE2_PREFIX = "0xff";

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

export function computeSmartAccountAddress(owner: Hex, salt: bigint = 0n): Hex {
  if (!SIMPLE_ACCOUNT_FACTORY_ADDRESS) {
    throw new Error("NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS not set");
  }

  const saltHex = keccak256(encodePacked(["uint256"], [salt]));

  const creationCode = encodePacked(
    ["bytes1", "address", "bytes32"],
    [CREATE2_PREFIX, SIMPLE_ACCOUNT_FACTORY_ADDRESS, saltHex],
  );

  return getAddress(`0x${keccak256(creationCode).slice(-40)}`);
}

export { SIMPLE_ACCOUNT_FACTORY_ABI, SIMPLE_ACCOUNT_FACTORY_ADDRESS };
