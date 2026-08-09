import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { type Hex, encodeFunctionData } from "viem";
import { computeSmartAccountAddress, SIMPLE_ACCOUNT_FACTORY_ABI } from "../utils/account";

export function useSmartAccount() {
  const { address: ownerAddress } = useAccount();
  const publicClient = usePublicClient();
  const [smartAccountAddress, setSmartAccountAddress] = useState<Hex | null>(null);
  const [isDeployed, setIsDeployed] = useState(false);
  const [loading, setLoading] = useState(false);

  const computeAddress = useCallback(async () => {
    if (!ownerAddress) return;
    const addr = computeSmartAccountAddress(ownerAddress as Hex);
    setSmartAccountAddress(addr);
    return addr;
  }, [ownerAddress]);

  const checkDeployed = useCallback(async () => {
    if (!smartAccountAddress || !publicClient) return;
    const code = await publicClient.getCode({ address: smartAccountAddress });
    setIsDeployed(code !== "0x");
  }, [smartAccountAddress, publicClient]);

  useEffect(() => {
    computeAddress();
  }, [computeAddress]);

  useEffect(() => {
    if (smartAccountAddress) {
      checkDeployed();
    }
  }, [smartAccountAddress, checkDeployed]);

  return {
    smartAccountAddress,
    isDeployed,
    loading,
    computeAddress,
    checkDeployed,
  };
}
