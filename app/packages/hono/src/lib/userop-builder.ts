import { type Hex, encodeFunctionData } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const BUNDLER_URL = process.env.BUNDLER_URL || "http://localhost:4337";
const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57C578A026d2789";

export interface BuildUserOpParams {
  target: Hex;
  calldata: Hex;
  sessionKeyPrivateKey: Hex;
  nonce?: bigint;
}

export interface UserOpResult {
  userOpHash: Hex;
  receipt?: unknown;
}

export interface UserOperation {
  sender: Hex;
  nonce: string;
  callData: Hex;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: Hex;
  signature: Hex;
}

async function rpcCall(method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(BUNDLER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result;
}

export async function buildAndSendUserOp(params: BuildUserOpParams): Promise<UserOpResult> {
  const { calldata, sessionKeyPrivateKey, nonce = 0n } = params;

  const sessionAccount = privateKeyToAccount(sessionKeyPrivateKey);

  const userOp: UserOperation = {
    sender: sessionAccount.address,
    nonce: `0x${nonce.toString(16)}`,
    callData: calldata,
    callGasLimit: "0x30d40",
    verificationGasLimit: "0x30d40",
    preVerificationGas: "0xc350",
    maxFeePerGas: "0x0",
    maxPriorityFeePerGas: "0x0",
    paymasterAndData: "0x",
    signature: "0x",
  };

  const userOpHash = await rpcCall("eth_sendUserOperation", [userOp, ENTRY_POINT_ADDRESS]) as Hex;

  return { userOpHash };
}

export function encodeContractCall(
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[],
): Hex {
  return encodeFunctionData({ abi: abi as any, functionName, args });
}

export function buildExecuteCall(target: Hex, calldata: Hex): Hex {
  const ExecuteABI = [
    {
      name: "execute",
      type: "function",
      stateMutability: "nonpayable",
      inputs: [
        { name: "dest", type: "address" },
        { name: "value", type: "uint256" },
        { name: "func", type: "bytes" },
      ],
      outputs: [],
    },
  ] as const;

  return encodeFunctionData({
    abi: ExecuteABI,
    functionName: "execute",
    args: [target, 0n, calldata],
  });
}

export async function waitForUserOp(userOpHash: Hex) {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await rpcCall("eth_getUserOperationReceipt", [userOpHash]);
      if (receipt) return receipt;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Timeout waiting for UserOperation receipt");
}
