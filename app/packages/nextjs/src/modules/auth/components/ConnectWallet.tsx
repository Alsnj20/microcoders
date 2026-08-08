"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useSiwe } from "../hooks/useSiwe";

export function ConnectWallet() {
  const { isConnected, address } = useAccount();
  const { login, loading, error } = useSiwe();

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-background/60 backdrop-blur-md rounded-2xl border border-border/40 shadow-xl max-w-md w-full mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-primary text-3xl">vpn_key</span>
      </div>

      <h2 className="text-2xl font-bold tracking-tight text-center text-foreground mb-2">Acceso a MemoryChain</h2>
      <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
        Conecta tu wallet y firma el mensaje criptográfico para autenticar tu sesión de forma segura y sin contraseñas.
      </p>

      {!isConnected ? (
        <div className="flex justify-center w-full">
          <ConnectButton label="Conectar Wallet" />
        </div>
      ) : (
        <div className="flex flex-col items-center w-full gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-accent/40 rounded-lg border border-border/20 w-full justify-between">
            <span className="text-xs text-muted-foreground font-medium">Wallet conectada:</span>
            <span className="text-sm font-mono font-bold text-foreground">
              {address ? truncateAddress(address) : ""}
            </span>
          </div>

          <button
            type="button"
            onClick={login}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary/95 text-primary-foreground text-sm font-semibold py-3 px-4 rounded-xl shadow-md transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                <span>Firmando desafío...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">draw</span>
                <span>Firmar Acceso (SIWE)</span>
              </>
            )}
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg w-full text-center">
          {error}
        </div>
      )}
    </div>
  );
}
