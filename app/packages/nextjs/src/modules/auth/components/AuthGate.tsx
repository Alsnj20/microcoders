"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { api, setWalletAddress } from "~~/services/api/client";
import { useGlobalState } from "~~/services/store/store";
import { OnboardingFlow } from "./OnboardingFlow";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { session, setSession, setCreditBalance } = useGlobalState();
  const { address, isConnected } = useAccount();
  const [ready, setReady] = useState(false);

  // Check on-chain registration status
  const { data: isRegistered } = useScaffoldReadContract({
    contractName: "UserRegistry",
    functionName: "isRegistered",
    args: [address],
  });

  // Read onboarding status synchronously on mount
  useEffect(() => {
    console.log("[Auth] Mounted");
    setReady(true);
  }, []);

  // Set wallet address for API
  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
      console.log("[Auth] Wallet:", address);
    } else {
      setWalletAddress(null);
    }
  }, [isConnected, address]);

  // Register user when wallet connects and user is registered on-chain
  useEffect(() => {
    if (!ready || !isConnected || !address || isRegistered === undefined) return;

    // If not registered on-chain, OnboardingFlow handles registration
    if (!isRegistered) return;

    const username = localStorage.getItem("mc_username") || "user";

    // Update session with current wallet address
    if (session.address !== address) {
      console.log("[Auth] Session:", { address, username });
      setSession({
        address,
        chainId: 412346,
        username,
        isAuthenticated: true,
        kWallet: null,
        kRecovery: null,
      });

      // Buy credits if pack was selected during onboarding
      const setup = async () => {
        try {
          const pack = localStorage.getItem("mc_selected_pack");
          if (pack && pack !== "0") {
            console.log("[Auth] Buying", pack, "MC...");
            await api.credits.buy.$post({ json: { amount: Number(pack) } });
            console.log("[Auth] Credits bought");
            localStorage.removeItem("mc_selected_pack");
          }

          const balRes = await api.credits.balance.$get();
          if (balRes.ok) {
            const data = await balRes.json();
            console.log("[Auth] Balance:", data.balance, "MC");
            setCreditBalance(data.balance ?? 0);
          }
        } catch (err: any) {
          console.error("[Auth] Error:", err.message);
        }
      };
      setup();
    }
  }, [ready, isConnected, address, isRegistered, session.address]);

  // Sync balance
  useEffect(() => {
    if (!session.isAuthenticated || !session.address) return;
    const fetch = async () => {
      try {
        const res = await api.credits.balance.$get();
        if (res.ok) {
          const data = await res.json();
          setCreditBalance(data.balance ?? 0);
        }
      } catch {}
    };
    fetch();
    const i = setInterval(fetch, 30000);
    return () => clearInterval(i);
  }, [session.isAuthenticated, session.address]);

  if (!ready) return null;

  // Wallet not connected → show onboarding (full flow including connect step)
  if (!isConnected) {
    return <OnboardingFlow />;
  }

  // Wallet connected but not registered on-chain → show onboarding (skip connect step)
  if (isRegistered === false) {
    return <OnboardingFlow startStep="credits" />;
  }

  // Loading on-chain state
  if (isRegistered === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-5rem)] px-4">
        <div className="w-full max-w-md text-center text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return <>{children}</>;
}
