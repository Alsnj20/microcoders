"use client";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";

const CREDIT_PACKS = [
  { amount: 50, price: "0.005", label: "Plan Starter", description: "Para empezar" },
  { amount: 100, price: "0.01", label: "Plan Regular", description: "Uso regular" },
  { amount: 200, price: "0.02", label: "Plan Pro", description: "Power user" },
];

export function OnboardingFlow() {
  const [username, setUsername] = useState("");
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [step, setStep] = useState<"welcome" | "credits" | "username" | "connect">("welcome");
  const { isConnected, address } = useAccount();

  // When wallet connects on the connect step, auto-complete
  useEffect(() => {
    if (step === "connect" && isConnected && address) {
      console.log("[Onboarding] Wallet connected:", address);
      localStorage.setItem("mc_onboarding_done", "true");
      console.log("[Onboarding] Onboarding complete — reloading");
      window.location.reload();
    }
  }, [step, isConnected, address]);

  const handleCompleteUsername = () => {
    localStorage.setItem("mc_username", username.trim());
    console.log("[Onboarding] Username:", username || "(none)");
    setStep("connect");
  };

  const handleSkipUsername = () => {
    localStorage.setItem("mc_username", "");
    setStep("connect");
  };

  const handleSkipAll = () => {
    localStorage.setItem("mc_onboarding_done", "true");
    localStorage.setItem("mc_username", "");
    localStorage.setItem("mc_selected_pack", "0");
    console.log("[Onboarding] Skipped");
    window.location.reload();
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-5rem)] px-4">
      <div className="w-full max-w-lg">
        {/* Step 1: Welcome */}
        {step === "welcome" && (
          <div className="text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">rocket_launch</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Bienvenido a MemoryChain</h1>
              <p className="text-muted-foreground">
                Tu conocimiento de IA, descentralizado. Configura tu cuenta para empezar.
              </p>
            </div>
            <Button size="lg" onClick={() => setStep("credits")}>
              Comenzar
            </Button>
          </div>
        )}

        {/* Step 2: Credits */}
        {step === "credits" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-1">Elige tu plan</h2>
              <p className="text-sm text-muted-foreground">
                Los créditos (MC) se usan para crear memorias, agentes y ejecutar consultas.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.amount}
                  onClick={() => setSelectedPack(pack.amount)}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    selectedPack === pack.amount
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="text-2xl font-bold text-foreground">{pack.amount}</p>
                  <p className="text-xs text-muted-foreground mt-1">MC</p>
                  <p className="text-xs text-primary font-medium mt-2">{pack.price} ETH</p>
                  <p className="text-xs text-muted-foreground mt-1">{pack.description}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" size="lg" onClick={() => {
                localStorage.setItem("mc_selected_pack", selectedPack?.toString() || "0");
                console.log("[Onboarding] Pack:", selectedPack, "MC");
                setStep("username");
              }}>
                Continuar
              </Button>
              <Button variant="outline" size="lg" onClick={() => {
                localStorage.setItem("mc_selected_pack", "0");
                setStep("username");
              }}>
                Saltar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Username */}
        {step === "username" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-1">Elige tu username</h2>
              <p className="text-sm text-muted-foreground">
                Opcional. Puedes configurarlo más tarde.
              </p>
            </div>
            <div>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="MiUsername"
                className="text-center text-lg h-12"
                maxLength={30}
              />
              {username && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Tu perfil será visible como <span className="font-medium text-foreground">{username}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" size="lg" onClick={handleCompleteUsername}>
                Continuar
              </Button>
              <Button variant="outline" size="lg" onClick={handleSkipUsername}>
                Omitir
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Connect Wallet */}
        {step === "connect" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-1">Conecta tu wallet</h2>
              <p className="text-sm text-muted-foreground">
                Conecta tu wallet para empezar a usar MemoryChain.
              </p>
            </div>
            <div className="flex justify-center">
              <ConnectButton
                label="Conectar Wallet"
                showBalance={false}
                chainStatus="none"
                accountStatus="address"
              />
            </div>
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={handleSkipAll}>
                Omitir por ahora
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
