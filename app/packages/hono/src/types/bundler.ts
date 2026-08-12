import type { Hex } from "viem";

export interface BundlerConfig {
  url: string;
  entryPointAddress: Hex;
  chainId: number;
}

export interface UserOpFields {
  sender: Hex;
  nonce: bigint;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
  paymasterAndData: Hex;
  signature: Hex;
}
