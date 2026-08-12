import { type Hex, type Chain, createPublicClient, encodeFunctionData, http, keccak256, concat, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

/**
 * Solidity `toEthSignedMessageHash(bytes32)` — the message hash that SimpleAccount
 * validates against. EIP-191 prefixes the 32-byte value with
 * `\x19Ethereum Signed Message:\n32`. The prefix string is 28 bytes — do NOT pad
 * it to 32 (stringToHex with { size: 32 } appends 4 zero bytes → wrong hash).
 */
function toEthSignedMessageHash(hash: Hex): Hex {
  const prefix = stringToHex("\x19Ethereum Signed Message:\n32");
  return keccak256(concat([prefix, hash]));
}

const BUNDLER_URL = process.env.BUNDLER_URL || "http://localhost:4337";

// ── Minimal ABIs needed to build a v0.6 UserOp ────────────────────────────

// EntryPoint v0.6 (canonical 0x5FF137D4b0FDCD49DcA30c7CF57C578A026d2789 or
// a locally deployed instance). Only the two views we need.
const ENTRY_POINT_ABI = [
  {
    type: "function",
    name: "getUserOpHash",
    stateMutability: "view",
    inputs: [
      {
        name: "userOp",
        type: "tuple",
        components: [
          { name: "sender", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "initCode", type: "bytes" },
          { name: "callData", type: "bytes" },
          { name: "callGasLimit", type: "uint256" },
          { name: "verificationGasLimit", type: "uint256" },
          { name: "preVerificationGas", type: "uint256" },
          { name: "maxFeePerGas", type: "uint256" },
          { name: "maxPriorityFeePerGas", type: "uint256" },
          { name: "paymasterAndData", type: "bytes" },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "function",
    name: "getNonce",
    stateMutability: "view",
    inputs: [
      { name: "sender", type: "address" },
      { name: "key", type: "uint192" },
    ],
    outputs: [{ name: "nonce", type: "uint256" }],
  },
] as const;

// SimpleAccount.execute(address dest, uint256 value, bytes func) — wraps the
// real contract call so the EntryPoint can execute it from the smart account.
const EXECUTE_ABI = [
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "dest", type: "address" },
      { name: "value", type: "uint256" },
      { name: "func", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

export interface BuildUserOpParams {
  target: Hex;
  calldata: Hex;
  value?: bigint;
  sessionKeyPrivateKey: Hex;
  smartAccount: Hex;
  entryPointAddress: Hex;
  chain: Chain;
  rpcUrl: string;
  bundlerUrl?: string;
  initCode?: Hex;
}

export interface UserOpResult {
  userOpHash: Hex;
  receipt?: unknown;
}

export interface UserOperation {
  sender: Hex;
  nonce: bigint;
  initCode: Hex;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
}

async function rpcCall(bundlerUrl: string, method: string, params: unknown[]): Promise<unknown> {
  // ERC-4337 RPC quantities must be HEX strings (0x-prefixed), and viem's UserOp
  // carries bigint fields. Serialize bigints to 0x hex so the bundler validates.
  const toHexQuantity = (value: bigint) => `0x${value.toString(16)}`;
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: Date.now(),
    method,
    params,
  }, (_, value) => (typeof value === "bigint" ? toHexQuantity(value) : value));
  console.log(`[UserOp] rpcCall ${method} body:`, body.substring(0, 500));
  const response = await fetch(bundlerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return data.result;
}

/**
 * Builds, signs and submits a v0.6 UserOperation to the bundler.
 *
 * sender = the user's smart account; callData = SimpleAccount.execute(...);
 * signature = ECDSA of the EntryPoint userOpHash signed with the session key
 * (the session key is the smart account's owner). Gas is paid by the smart
 * account, not by the backend.
 */
export async function buildAndSendUserOp(params: BuildUserOpParams): Promise<UserOpResult> {
  const {
    target,
    calldata,
    value = 0n,
    sessionKeyPrivateKey,
    smartAccount,
    entryPointAddress,
    chain,
    rpcUrl,
    bundlerUrl = BUNDLER_URL,
    initCode = "0x",
  } = params;

  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
  const sessionAccount = privateKeyToAccount(sessionKeyPrivateKey);

  // Real on-chain nonce for the smart account (key 0).
  const nonce = (await publicClient.readContract({
    address: entryPointAddress,
    abi: ENTRY_POINT_ABI,
    functionName: "getNonce",
    args: [smartAccount, 0n],
  })) as bigint;

  // Wrap the actual call into SimpleAccount.execute(dest, value, func).
  const executeData = encodeFunctionData({
    abi: EXECUTE_ABI,
    functionName: "execute",
    args: [target, value, calldata],
  });

  // Fee ceiling derived from the current base fee (L2s: base fee is tiny).
  const block = await publicClient.getBlock({ blockTag: "latest" });
  const baseFee = block.baseFeePerGas ?? 1_000_000_000n;
  const maxFeePerGas = baseFee * 2n;

  const userOp: UserOperation = {
    sender: smartAccount,
    nonce,
    initCode,
    callData: executeData,
    callGasLimit: 1_000_000n,
    verificationGasLimit: 250_000n,
    preVerificationGas: 100_000n,
    maxFeePerGas,
    maxPriorityFeePerGas: 0n,
    paymasterAndData: "0x",
    signature: "0x",
  };

  // Prefer bundler gas estimation, but never go below the generous defaults
  // (a deployed-with-initCode smart account needs a lot of verification gas —
  // taking the minimum here causes AA40 over verificationGasLimit).
  try {
    const estimated = (await rpcCall(bundlerUrl, "eth_estimateUserOperationGas", [
      userOp,
      entryPointAddress,
    ])) as { callGasLimit?: string; verificationGasLimit?: string; preVerificationGas?: string };
    if (estimated) {
      if (estimated.callGasLimit) userOp.callGasLimit = max(userOp.callGasLimit, BigInt(estimated.callGasLimit));
      if (estimated.verificationGasLimit) {
        userOp.verificationGasLimit = max(userOp.verificationGasLimit, BigInt(estimated.verificationGasLimit));
      }
      if (estimated.preVerificationGas) {
        userOp.preVerificationGas = max(userOp.preVerificationGas, BigInt(estimated.preVerificationGas));
      }
    }
  } catch {
    // fallback defaults are already set
  }

  // userOpHash comes from the EntryPoint itself (EIP-712), then we ECDSA-sign it.
  const userOpHash = (await publicClient.readContract({
    address: entryPointAddress,
    abi: ENTRY_POINT_ABI,
    functionName: "getUserOpHash",
    args: [userOp],
  })) as Hex;

  // SimpleAccount._validateSignature computes toEthSignedMessageHash(userOpHash)
  // before ECDSA.recover, so we must sign THAT (not the raw userOpHash).
  const messageHash = toEthSignedMessageHash(userOpHash);
  userOp.signature = await sessionAccount.sign({ hash: messageHash });

  const opHash = (await rpcCall(bundlerUrl, "eth_sendUserOperation", [
    userOp,
    entryPointAddress,
  ])) as Hex;

  return { userOpHash: opHash };
}export async function waitForUserOp(userOpHash: Hex, bundlerUrl: string = BUNDLER_URL) {
  const maxAttempts = 30;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const receipt = await rpcCall(bundlerUrl, "eth_getUserOperationReceipt", [userOpHash]) as { success: boolean } | null;
      if (receipt) {
        if (receipt.success === false) {
          throw new Error(`UserOperation failed on-chain (hash ${userOpHash.slice(0, 10)}…)`);
        }
        return receipt;
      }
    } catch {
      // retry
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error("Timeout waiting for UserOperation receipt");
}
