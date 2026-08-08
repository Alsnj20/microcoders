"use client";

import { useGlobalState } from "~~/services/store/store";
import { ConnectWallet } from "./ConnectWallet";

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { session } = useGlobalState();

  if (!session.isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-5rem)] px-4">
        <div className="w-full max-w-md">
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
