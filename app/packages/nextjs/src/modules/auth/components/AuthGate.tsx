"use client";

import { useEffect } from "react";
import { useGlobalState } from "~~/services/store/store";
import { api } from "~~/services/api/client";

const DEV_WALLET = "0xDD09b55496EaA3cFAe23137ABDeA52a9a979B70e";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { session, setSession, setCreditBalance } = useGlobalState();

  // Dev auto-auth: skip SIWE on localhost
  useEffect(() => {
    if (!session.isAuthenticated && window.location.hostname === "localhost") {
      setSession({
        address: DEV_WALLET,
        chainId: 412346,
        username: "dev-user",
        isAuthenticated: true,
        kWallet: null,
        kRecovery: null,
      });
    }
  }, [session.isAuthenticated, setSession]);

  // Sync credit balance from chain
  useEffect(() => {
    if (!session.isAuthenticated || !session.address) return;

    const fetchBalance = async () => {
      try {
        const res = await api.credits.balance.$get();
        if (res.ok) {
          const data = await res.json();
          setCreditBalance(data.balance ?? 0);
        }
      } catch {
        // Silently fail - balance will show as 0
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [session.isAuthenticated, session.address, setCreditBalance]);

  if (!session.isAuthenticated) {
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
