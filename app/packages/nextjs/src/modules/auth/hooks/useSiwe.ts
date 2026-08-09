import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useDisconnect, useSignMessage } from "wagmi";
import { api } from "~~/services/api/client";
import { deriveKWallet } from "~~/services/crypto/keys";
import { useGlobalState } from "~~/services/store/store";

export function useSiwe() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const { session, setSession } = useGlobalState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check current session on mount or when address changes
  const checkSession = useCallback(async () => {
    console.log("[SIWE] checkSession called | address:", address, "isConnected:", isConnected);
    try {
      const res = await api.auth.session.$get();
      console.log("[SIWE] checkSession response:", res.status, res.ok);
      if (res.ok) {
        const data = (await res.json()) as any;
        console.log("[SIWE] checkSession data:", data);
        // Check if address matches the connected wallet address
        if (address && data.address.toLowerCase() === address.toLowerCase()) {
          console.log("[SIWE] checkSession: session valid, setting isAuthenticated=true");
          setSession({
            address: data.address,
            chainId: data.chainId,
            username: data.username,
            isAuthenticated: true,
            kWallet: session.kWallet,
            kRecovery: session.kRecovery,
          });
          return;
        } else {
          console.log("[SIWE] checkSession: address mismatch");
        }
      }
    } catch (e) {
      console.log("[SIWE] checkSession: no session (caught):", e);
    }

    // Clear session if checks fail
    console.log("[SIWE] checkSession: clearing session");
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
    console.log("[SIWE] useEffect: isConnected:", isConnected, "address:", address);
    if (isConnected && address) {
      checkSession();
    } else {
      console.log("[SIWE] useEffect: clearing session (not connected)");
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
    console.log("[SIWE] login() called | address:", address, "isConnected:", isConnected);
    if (!address) {
      console.error("[SIWE] login: no address");
      throw new Error("Wallet not connected");
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Get SIWE challenge from Hono backend
      console.log("[SIWE] login step 1: fetching challenge for address:", address);
      const challengeRes = await api.auth.challenge.$get({
        query: { address },
      });
      console.log("[SIWE] login step 1: challenge response:", challengeRes.status, challengeRes.ok);
      if (!challengeRes.ok) {
        throw new Error("Failed to get sign-in challenge");
      }
      const challenge = (await challengeRes.json()) as any;
      console.log("[SIWE] login step 1: challenge message:", challenge.message?.substring(0, 80) + "...");

      // 2. Sign the challenge message using the user's wallet
      console.log("[SIWE] login step 2: calling signMessageAsync...");
      const signature = await signMessageAsync({
        message: challenge.message,
      });
      console.log("[SIWE] login step 2: signature obtained:", signature?.substring(0, 20) + "...");

      // 3. Derive the kWallet from signature
      console.log("[SIWE] login step 3: deriving kWallet...");
      const kWallet = await deriveKWallet(signature);
      console.log("[SIWE] login step 3: kWallet derived");

      // 4. Verify signature and create session on Hono backend
      console.log("[SIWE] login step 4: verifying signature...");
      const verifyRes = await api.auth.verify.$post({
        json: {
          message: challenge.message,
          signature,
          address,
        },
      });
      console.log("[SIWE] login step 4: verify response:", verifyRes.status, verifyRes.ok);

      if (!verifyRes.ok) {
        const errData = (await verifyRes.json()) as any;
        console.error("[SIWE] login step 4: verify failed:", errData);
        throw new Error(errData.message || "Failed to verify signature");
      }

      const sessionData = (await verifyRes.json()) as any;
      console.log("[SIWE] login step 4: session created:", sessionData);
      setSession({
        address: sessionData.address,
        chainId: sessionData.chainId,
        username: sessionData.username,
        isAuthenticated: true,
        kWallet,
        kRecovery: null,
      });
      console.log("[SIWE] login: complete, session set");
    } catch (err: unknown) {
      console.error("[SIWE] login error:", err);
      setError(err instanceof Error ? err.message : "Authentication failed");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Revoke all active session keys
      try {
        const keysRes = await api["session-keys"].$get();
        if (keysRes.ok) {
          const { keys } = (await keysRes.json()) as any;
          for (const key of keys) {
            if (key.isActive) {
              await api["session-keys"][key.keyId].$delete();
            }
          }
        }
      } catch (e) {
        console.error("Failed to revoke session keys:", e);
      }

      // Delete backend session and clear cookie
      await api.auth.session.$delete();

      // Disconnect wallet via wagmi
      disconnect();

      // Clear frontend session state
      setSession({
        address: null,
        chainId: null,
        username: null,
        isAuthenticated: false,
        kWallet: null,
        kRecovery: null,
      });

      // Navigate to home
      router.push("/");
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
