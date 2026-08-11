"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";
import { api, setWalletAddress } from "~~/services/api/client";
import { loadKWallet, loadKRecovery } from "~~/services/crypto/session-storage";
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
  const [sessionKeyDone, setSessionKeyDone] = useState(false);

  // Check on-chain registration status
  const { data: isRegistered } = useScaffoldReadContract({
    contractName: "UserRegistry",
    functionName: "isRegistered",
    args: [address],
  });

  // Read on-chain username directly from UserRegistry smart contract
  const { data: onChainUsername } = useScaffoldReadContract({
    contractName: "UserRegistry",
    functionName: "getUsername",
    args: [address],
  });

  // Read onboarding status synchronously on mount
  useEffect(() => {
    console.log("[Auth] Mounted");
    const active = localStorage.getItem("mc_session_key_active");
    if (active === "true") {
      setSessionKeyDone(true);
    }
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

  // After SIWE auth and on-chain registration, sync session & balance
  useEffect(() => {
    console.log("[Auth] Session sync effect:", {
      ready,
      isConnected,
      address,
      isRegistered,
      siweAuthenticated,
      onChainUsername,
      sessionAddress: session.address,
    });
    if (!ready || !isConnected || !address || isRegistered === undefined) return;
    if (!isRegistered) return;
    if (!siweAuthenticated) return;

    const resolvedUsername = onChainUsername || localStorage.getItem("mc_username") || session.username || "user";

    if (session.address !== address || session.username !== resolvedUsername) {
      console.log("[Auth] Setting session with on-chain username:", { address, username: resolvedUsername });
      setSession({
        address,
        chainId: 412346,
        username: resolvedUsername,
        isAuthenticated: true,
        kWallet: session.kWallet || loadKWallet(address) || null,
        kRecovery: session.kRecovery || loadKRecovery(address) || null,
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
  }, [ready, isConnected, address, isRegistered, siweAuthenticated, onChainUsername, session.address, session.username, session.kWallet, session.kRecovery, setSession, setCreditBalance]);

  // Periodic balance sync
  useEffect(() => {
    if (!session.isAuthenticated || !session.address) return;
    const fetchBalance = async () => {
      try {
        const res = await api.credits.balance.$get();
        if (res.ok) {
          const data = await res.json();
          setCreditBalance(data.balance ?? 0);
        }
      } catch {}
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [session.isAuthenticated, session.address, setCreditBalance]);

  const handleOnboardingComplete = useCallback(() => {
    console.log("[Auth] Onboarding completed callback triggered");
    localStorage.setItem("mc_session_key_active", "true");
    setSessionKeyDone(true);
  }, []);

  if (!ready) {
    return null;
  }

  console.log("[Auth] Render decision:", { isConnected, isRegistered, siweAuthenticated, sessionKeyDone });

  // 1. Wallet not connected or SIWE not completed → Step 1: SIWE
  if (!isConnected || !siweAuthenticated) {
    console.log("[Auth] → Rendering OnboardingFlow (startStep=siwe)");
    return <OnboardingFlow startStep="siwe" onComplete={handleOnboardingComplete} />;
  }

  // 2. SIWE completed, loading on-chain account status
  if (isRegistered === undefined) {
    console.log("[Auth] → Rendering loading state (isRegistered=undefined)");
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-5rem)] px-4">
        <div className="w-full max-w-md text-center text-muted-foreground">
          <span className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full inline-block mb-2" />
          <p>Verificando cuenta on-chain...</p>
        </div>
      </div>
    );
  }

  // 3. User does NOT have account on-chain → Step 2: Initial MC purchase & Username -> Session key
  if (isRegistered === false) {
    console.log("[Auth] → Rendering OnboardingFlow (startStep=credits)");
    return <OnboardingFlow startStep="credits" onComplete={handleOnboardingComplete} />;
  }

  // 4. User ALREADY HAS account on-chain, but session key contract not signed yet → Step 3: Session key contract
  if (!sessionKeyDone) {
    console.log("[Auth] → Rendering OnboardingFlow (startStep=session-key)");
    return <OnboardingFlow startStep="session-key" onComplete={handleOnboardingComplete} />;
  }

  // 5. Fully onboarded and authenticated → Render app
  console.log("[Auth] → Rendering children (fully authenticated)");
  return <>{children}</>;
}
