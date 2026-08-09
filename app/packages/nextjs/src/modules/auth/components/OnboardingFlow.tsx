"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { api } from "~~/services/api/client";
import { useSmartAccount } from "~~/modules/smart-account/hooks/useSmartAccount";
import { useSiwe } from "../hooks/useSiwe";

const CREDIT_PACKS = [
  { amount: 50, price: "0.005", label: "Plan Starter", description: "Para empezar" },
  { amount: 100, price: "0.01", label: "Plan Regular", description: "Uso regular" },
  { amount: 200, price: "0.02", label: "Plan Pro", description: "Power user" },
];

type OnboardingStep = "welcome" | "credits" | "username" | "connect" | "siwe";

interface OnboardingFlowProps {
  startStep?: OnboardingStep;
}

export function OnboardingFlow({ startStep = "welcome" }: OnboardingFlowProps) {
  const [username, setUsername] = useState("");
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [step, setStep] = useState<OnboardingStep>(startStep);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const { isConnected, address } = useAccount();
  const { login: siweLogin, loading: siweLoading, error: siweError } = useSiwe();
  const { smartAccountAddress, isDeployed } = useSmartAccount();

  console.log("[Onboarding] Render | step:", step, "isConnected:", isConnected, "address:", address, "startStep:", startStep);

  const handleCompleteUsername = () => {
    const trimmed = username.trim();
    if (trimmed.length > 0 && trimmed.length < 3) {
      setRegisterError("Username must be at least 3 characters");
      return;
    }
    setRegisterError(null);
    localStorage.setItem("mc_username", trimmed);
    console.log("[Onboarding] Username:", trimmed || "(none)", "| isConnected:", isConnected);

    // If wallet is already connected, go to SIWE step
    if (isConnected) {
      console.log("[Onboarding] → Transitioning to siwe step");
      setStep("siwe");
    } else {
      console.log("[Onboarding] → Transitioning to connect step");
      setStep("connect");
    }
  };

  const handleSkipUsername = () => {
    localStorage.setItem("mc_username", "");
    console.log("[Onboarding] Username skipped | isConnected:", isConnected);

    // If wallet is already connected, go to SIWE step
    if (isConnected) {
      console.log("[Onboarding] → Transitioning to siwe step");
      setStep("siwe");
    } else {
      console.log("[Onboarding] → Transitioning to connect step");
      setStep("connect");
    }
  };

  const handleSkipAll = () => {
    localStorage.setItem("mc_username", "");
    localStorage.setItem("mc_selected_pack", "0");
    console.log("[Onboarding] Skipped all | isConnected:", isConnected);

    // If wallet is already connected, go to SIWE step
    if (isConnected) {
      console.log("[Onboarding] → Transitioning to siwe step");
      setStep("siwe");
    } else {
      console.log("[Onboarding] → Transitioning to connect step");
      setStep("connect");
    }
  };

  const handleSiweAndRegister = async () => {
    console.log("[Onboarding] handleSiweAndRegister called");
    setRegisterError(null);
    try {
      console.log("[Onboarding] Step 1: Calling siweLogin()...");
      await siweLogin();
      console.log("[Onboarding] Step 1 complete: siweLogin() returned");

      const pack = localStorage.getItem("mc_selected_pack");
      const packNum = pack ? Number(pack) : 0;
      const finalPack = packNum > 0 ? packNum : selectedPack;
      console.log("[Onboarding] Step 2: registerAndComplete(", username.trim() || "user", ",", finalPack, ")");
      await registerAndComplete(username.trim() || "user", finalPack);

      // Store smart account address for session key flow
      if (smartAccountAddress) {
        localStorage.setItem("mc_smart_account", smartAccountAddress);
        console.log("[Onboarding] Smart account address stored:", smartAccountAddress);
      }
    } catch (err) {
      console.error("[Onboarding] SIWE failed:", err);
    }
  };

  const registerAndComplete = async (regUsername: string, pack: number | null) => {
    setRegistering(true);
    setRegisterError(null);
    try {
      console.log("[Onboarding] registerAndComplete: registering user:", regUsername);
      const regRes = await api.user.register.$post({ json: { username: regUsername } });
      console.log("[Onboarding] registerAndComplete: register response:", regRes.status, regRes.ok);

      if (!regRes.ok) {
        const errBody = await regRes.json().catch(() => null);
        const code = errBody?.code;
        const msg = errBody?.message ?? "";
        const isAlreadyRegistered =
          regRes.status === 409 && code === "ALREADY_REGISTERED" ||
          msg.includes("0x436f6d6d") ||
          msg.includes("already exists");
        if (isAlreadyRegistered) {
          console.log("[Onboarding] User already registered, continuing");
        } else {
          console.error("[Onboarding] registerAndComplete: register failed:", msg);
          setRegisterError(msg || `Registration failed (${regRes.status})`);
          return;
        }
      }

      if (pack && pack > 0) {
        console.log("[Onboarding] registerAndComplete: buying", pack, "MC...");
        const buyRes = await api.credits.buy.$post({ json: { amount: pack } });
        console.log("[Onboarding] registerAndComplete: buy response:", buyRes.status, buyRes.ok);
        if (!buyRes.ok) {
          const errBody = await buyRes.json().catch(() => null);
          setRegisterError(errBody?.message ?? `Credit purchase failed (${buyRes.status})`);
        }
        localStorage.removeItem("mc_selected_pack");
      }

      console.log("[Onboarding] registerAndComplete: done, AuthGate will re-render");
    } catch (err: any) {
      console.error("[Onboarding] registerAndComplete error:", err.message);
      setRegisterError(err.message);
    } finally {
      setRegistering(false);
    }
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
            <Button size="lg" onClick={() => { console.log("[Onboarding] → Transitioning to credits step"); setStep("credits"); }}>
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
              {CREDIT_PACKS.map(pack => (
                <button
                  key={pack.amount}
                  onClick={() => { setSelectedPack(pack.amount); console.log("[Onboarding] Pack selected:", pack.amount, "MC"); }}
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
              <Button
                className="flex-1"
                size="lg"
                onClick={() => {
                  localStorage.setItem("mc_selected_pack", selectedPack?.toString() || "0");
                  console.log("[Onboarding] Pack:", selectedPack, "MC → Transitioning to username step");
                  setStep("username");
                }}
              >
                Continuar
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  localStorage.setItem("mc_selected_pack", "0");
                  console.log("[Onboarding] Pack: skipped → Transitioning to username step");
                  setStep("username");
                }}
              >
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
              <p className="text-sm text-muted-foreground">Opcional. Puedes configurarlo más tarde.</p>
            </div>
            <div>
              <Input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="MiUsername"
                className="text-center text-lg h-12"
                maxLength={30}
                disabled={registering}
              />
              {username && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Tu perfil será visible como <span className="font-medium text-foreground">{username}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" size="lg" onClick={handleCompleteUsername} disabled={registering}>
                {registering ? "Registrando..." : "Continuar"}
              </Button>
              <Button variant="outline" size="lg" onClick={handleSkipUsername} disabled={registering}>
                Omitir
              </Button>
            </div>
            {registerError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg text-center">
                {registerError}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Connect Wallet */}
        {step === "connect" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-1">Conecta tu wallet</h2>
              <p className="text-sm text-muted-foreground">Conecta tu wallet para empezar a usar MemoryChain.</p>
            </div>
            <div className="flex justify-center">
              <ConnectButton label="Conectar Wallet" showBalance={false} chainStatus="none" accountStatus="address" />
            </div>
            {isConnected && (
              <div className="text-center">
                <Button size="lg" onClick={() => { console.log("[Onboarding] → Transitioning to siwe step"); setStep("siwe"); }} className="w-full">
                  Continuar a firma
                </Button>
              </div>
            )}
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={handleSkipAll}>
                Omitir por ahora
              </Button>
            </div>
          </div>
        )}

        {/* Step 5: SIWE Sign */}
        {step === "siwe" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-primary">draw</span>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">Firma tu acceso</h2>
              <p className="text-sm text-muted-foreground">
                Firma el mensaje criptográfico para autenticar tu sesión de forma segura.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleSiweAndRegister}
              disabled={siweLoading || registering}
            >
              {siweLoading ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                  Firmando desafío...
                </>
              ) : registering ? (
                "Registrando..."
              ) : (
                "Firmar Acceso (SIWE)"
              )}
            </Button>
            {siweError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg text-center">
                {siweError}
              </div>
            )}
            {registerError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg text-center">
                {registerError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
