import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { type Hex } from "viem";
import { getSmartAccountAddress } from "../utils/account";

/**
 * Resolves the user's SimpleAccount address (via factory.getAddress on-chain)
 * and whether it's already deployed.
 *
 * @param ownerOverride optional owner address. For production (Option B) this is
 *        the user's SESSION KEY address; when omitted it falls back to the
 *        connected wallet (dev convenience).
 */
export function useSmartAccount(ownerOverride?: Hex) {
  const { address: walletAddress } = useAccount();
  const publicClient = usePublicClient();
  const [smartAccountAddress, setSmartAccountAddress] = useState<Hex | null>(null);
  const [isDeployed, setIsDeployed] = useState(false);
  const [loading, setLoading] = useState(false);

  const owner = ownerOverride ?? walletAddress;

  const computeAddress = useCallback(async () => {
    if (!owner || !publicClient) return;
    setLoading(true);
    try {
      const addr = await getSmartAccountAddress(publicClient, owner as Hex);
      setSmartAccountAddress(addr);
    } finally {
      setLoading(false);
    }
  }, [owner, publicClient]);

  const checkDeployed = useCallback(async () => {
    if (!smartAccountAddress || !publicClient) return;
    const code = await publicClient.getCode({ address: smartAccountAddress });
    setIsDeployed(code !== "0x" && code !== null);
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
