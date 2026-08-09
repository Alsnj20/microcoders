"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { api, setWalletAddress } from "~~/services/api/client";
import { useGlobalState } from "~~/services/store/store";
import { useSiwe } from "../hooks/useSiwe";
import { OnboardingFlow } from "./OnboardingFlow";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { session, setSession, setCreditBalance } = useGlobalState();
  const { address, isConnected } = useAccount();
  const { isAuthenticated: siweAuthenticated } = useSiwe();
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
      console.log("[Auth] Wallet connected:", address);
    } else {
      setWalletAddress(null);
      console.log("[Auth] Wallet disconnected");
    }
  }, [isConnected, address]);

  // After SIWE auth and on-chain registration, sync session and buy pending credits
  useEffect(() => {
    console.log("[Auth] Session sync effect:", { ready, isConnected, address, isRegistered, siweAuthenticated, sessionAddress: session.address });
    if (!ready || !isConnected || !address || isRegistered === undefined) return;
    if (!isRegistered) return;
    if (!siweAuthenticated) return;

    const username = localStorage.getItem("mc_username") || "user";

    if (session.address !== address) {
      console.log("[Auth] Setting session:", { address, username });
      setSession({
        address,
        chainId: 412346,
        username,
        isAuthenticated: true,
        kWallet: session.kWallet,
        kRecovery: session.kRecovery,
      });

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
          console.error("[Auth] Setup error:", err.message);
        }
      };
      setup();
    }
  }, [ready, isConnected, address, isRegistered, siweAuthenticated, session.address]);

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

  if (!ready) {
    console.log("[Auth] Not ready yet");
    return null;
  }

  console.log("[Auth] Render decision:", { isConnected, isRegistered, siweAuthenticated });

  // Wallet not connected → show onboarding (full flow including connect step)
  if (!isConnected) {
    console.log("[Auth] → Rendering OnboardingFlow (startStep=welcome)");
    return <OnboardingFlow />;
  }

  // Wallet connected but not registered on-chain → show onboarding (skip connect step, still requires SIWE)
  if (isRegistered === false) {
    console.log("[Auth] → Rendering OnboardingFlow (startStep=credits)");
    return <OnboardingFlow startStep="credits" />;
  }

  // Loading on-chain state
  if (isRegistered === undefined) {
    console.log("[Auth] → Rendering loading state (isRegistered=undefined)");
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-5rem)] px-4">
        <div className="w-full max-w-md text-center text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  // Registered on-chain but SIWE not completed → show onboarding SIWE step
  if (!siweAuthenticated) {
    console.log("[Auth] → Rendering OnboardingFlow (startStep=siwe)");
    return <OnboardingFlow startStep="siwe" />;
  }

  console.log("[Auth] → Rendering children (fully authenticated)");
  return <>{children}</>;
}
