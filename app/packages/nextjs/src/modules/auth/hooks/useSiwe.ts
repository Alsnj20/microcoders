import { useCallback, useEffect, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { api } from "~~/services/api/client";
import { useGlobalState } from "~~/services/store/store";
import { deriveKWallet } from "~~/services/crypto/keys";

export function useSiwe() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { session, setSession } = useGlobalState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check current session on mount or when address changes
  const checkSession = useCallback(async () => {
    try {
      const res = await api.auth.session.$get();
      if (res.ok) {
        const data = (await res.json()) as any;
        // Check if address matches the connected wallet address
        if (address && data.address.toLowerCase() === address.toLowerCase()) {
          setSession({
            address: data.address,
            chainId: data.chainId,
            username: data.username,
            isAuthenticated: true,
            kWallet: session.kWallet,
            kRecovery: session.kRecovery,
          });
          return;
        }
      }
    } catch (e) {
      // Not authenticated, ignore error
    }

    // Clear session if checks fail
    setSession({
      address: null,
      chainId: null,
      username: null,
      isAuthenticated: false,
      kWallet: null,
      kRecovery: null,
    });
  }, [address, setSession, session.kWallet, session.kRecovery]);

  useEffect(() => {
    if (isConnected && address) {
      checkSession();
    } else {
      setSession({
        address: null,
        chainId: null,
        username: null,
        isAuthenticated: false,
        kWallet: null,
        kRecovery: null,
      });
    }
  }, [isConnected, address, checkSession, setSession]);

  const login = async () => {
    if (!address) {
      throw new Error("Wallet not connected");
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Get SIWE challenge from Hono backend
      const challengeRes = await api.auth.challenge.$get({
        query: { address },
      });
      if (!challengeRes.ok) {
        throw new Error("Failed to get sign-in challenge");
      }
      const challenge = (await challengeRes.json()) as any;

      // 2. Sign the challenge message using the user's wallet
      const signature = await signMessageAsync({
        message: challenge.message,
      });

      // 3. Derive the kWallet from signature
      const kWallet = await deriveKWallet(signature);

      // 4. Verify signature and create session on Hono backend
      const verifyRes = await api.auth.verify.$post({
        json: {
          message: challenge.message,
          signature,
          address,
        },
      });

      if (!verifyRes.ok) {
        const errData = (await verifyRes.json()) as any;
        throw new Error(errData.message || "Failed to verify signature");
      }

      const sessionData = (await verifyRes.json()) as any;
      setSession({
        address: sessionData.address,
        chainId: sessionData.chainId,
        username: sessionData.username,
        isAuthenticated: true,
        kWallet,
        kRecovery: null,
      });
    } catch (err: unknown) {
      console.error("SIWE Login Error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.auth.session.$delete();
      disconnect();
      setSession({
        address: null,
        chainId: null,
        username: null,
        isAuthenticated: false,
        kWallet: null,
        kRecovery: null,
      });
    } catch (err: unknown) {
      console.error("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    logout,
    loading,
    error,
    session,
    isAuthenticated: session.isAuthenticated,
  };
}
