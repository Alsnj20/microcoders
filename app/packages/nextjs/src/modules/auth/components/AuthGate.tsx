"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useGlobalState } from "~~/services/store/store";
import { api, setWalletAddress } from "~~/services/api/client";
import { OnboardingFlow } from "./OnboardingFlow";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { session, setSession, setCreditBalance } = useGlobalState();
  const { address, isConnected } = useAccount();
  const [ready, setReady] = useState(false);

  // Read onboarding status synchronously on mount
  useEffect(() => {
    const done = localStorage.getItem("mc_onboarding_done") === "true";
    console.log("[Auth] Onboarding:", done ? "done" : "pending");
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

  // Register user when wallet connects after onboarding
  useEffect(() => {
    if (!ready || !isConnected || !address) return;

    const onboardingDone = localStorage.getItem("mc_onboarding_done") === "true";
    if (!onboardingDone) return;

    const username = localStorage.getItem("mc_username") || "user";

    // Always update session with current wallet address
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

      // Register + buy credits
      const setup = async () => {
        try {
          console.log("[Auth] Registering...");
          await api.user.register.$post({ json: { username } });
          console.log("[Auth] Registered");

          const pack = localStorage.getItem("mc_selected_pack");
          if (pack && pack !== "0") {
            console.log("[Auth] Buying", pack, "MC...");
            await api.credits.buy.$post({ json: { amount: Number(pack) } });
            console.log("[Auth] Credits bought");
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
  }, [ready, isConnected, address, session.address]);

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

  const onboardingDone = localStorage.getItem("mc_onboarding_done") === "true";

  // Not done onboarding → show it
  if (!onboardingDone) {
    return <OnboardingFlow />;
  }

  // Done but no wallet
  if (!isConnected) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-5rem)] px-4">
        <div className="w-full max-w-md text-center text-muted-foreground">
          Conecta tu wallet para continuar
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
