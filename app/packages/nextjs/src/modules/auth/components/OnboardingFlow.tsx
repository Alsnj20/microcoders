"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { api } from "~~/services/api/client";
import { useSmartAccount } from "~~/modules/smart-account/hooks/useSmartAccount";
import { useSiwe } from "../hooks/useSiwe";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const CREDIT_PACKS = [
  { amount: 50, price: "0.005", label: "Plan Starter", description: "Para empezar" },
  { amount: 100, price: "0.01", label: "Plan Regular", description: "Uso regular" },
  { amount: 200, price: "0.02", label: "Plan Pro", description: "Power user" },
];

export type OnboardingStep = "siwe" | "credits" | "username" | "session-key";

interface OnboardingFlowProps {
  startStep?: OnboardingStep;
  onComplete?: () => void;
}

export function OnboardingFlow({ startStep = "siwe", onComplete }: OnboardingFlowProps) {
  const [username, setUsername] = useState("");
  const [selectedPack, setSelectedPack] = useState<number | null>(null);
  const [step, setStep] = useState<OnboardingStep>(startStep);
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [signingSessionKey, setSigningSessionKey] = useState(false);
  const [sessionKeyError, setSessionKeyError] = useState<string | null>(null);

  const { isConnected, address } = useAccount();
  const { login: siweLogin, loading: siweLoading, error: siweError, grantPermissions, isAuthenticated: siweAuthenticated } = useSiwe();
  const { smartAccountAddress } = useSmartAccount();

  // Read on-chain registration status
  const { data: isRegistered } = useScaffoldReadContract({
    contractName: "UserRegistry",
    functionName: "isRegistered",
    args: [address],
  });

  console.log("[Onboarding] Render | step:", step, "isConnected:", isConnected, "address:", address, "isRegistered:", isRegistered, "siweAuth:", siweAuthenticated);

  // Step 1: SIWE action
  const handleSiweLogin = async () => {
    console.log("[Onboarding] handleSiweLogin called");
    setRegisterError(null);
    try {
      await siweLogin();
      console.log("[Onboarding] SIWE login completed. Checking account status...");
      
      // After SIWE login: check if user has account on-chain
      // If user does NOT have account (isRegistered === false) -> go to initial MC purchase & username
      // If user ALREADY HAS account (isRegistered === true) -> go directly to signing session key contract
      if (isRegistered === false) {
        console.log("[Onboarding] User needs account setup → Transitioning to credits step");
        setStep("credits");
      } else {
        console.log("[Onboarding] User has account → Transitioning directly to session-key step");
        setStep("session-key");
      }
    } catch (err: any) {
      console.error("[Onboarding] SIWE login failed:", err.message);
    }
  };

  // Step 2 & 3: Register user on-chain + purchase credits
  const handleRegisterAccount = async (regUsername: string, pack: number | null) => {
    setRegistering(true);
    setRegisterError(null);
    try {
      console.log("[Onboarding] Registering user on-chain:", regUsername);
      const regRes = await api.user.register.$post({ json: { username: regUsername } });
      console.log("[Onboarding] Register response:", regRes.status, regRes.ok);

      if (!regRes.ok) {
        const errBody = await regRes.json().catch(() => null);
        const code = errBody?.code;
        const msg = errBody?.message ?? "";
        const isAlreadyRegistered =
          (regRes.status === 409 && code === "ALREADY_REGISTERED") ||
          msg.includes("0x436f6d6d") ||
          msg.includes("already exists");
        if (!isAlreadyRegistered) {
          console.error("[Onboarding] Registration failed:", msg);
          setRegisterError(msg || `Registration failed (${regRes.status})`);
          setRegistering(false);
          return;
        }
      }

      if (pack && pack > 0) {
        console.log("[Onboarding] Buying initial credits:", pack, "MC...");
        const buyRes = await api.credits.buy.$post({ json: { amount: pack } });
        if (!buyRes.ok) {
          const errBody = await buyRes.json().catch(() => null);
          console.warn("[Onboarding] Credit purchase error:", errBody?.message);
        }
        localStorage.removeItem("mc_selected_pack");
      }

      console.log("[Onboarding] Account registration complete → Transitioning to session-key step");
      setStep("session-key");
    } catch (err: any) {
      console.error("[Onboarding] Registration error:", err.message);
      setRegisterError(err.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleCompleteUsername = () => {
    const trimmed = username.trim();
    const finalUsername = trimmed.length >= 3 ? trimmed : `user_${address?.slice(2, 8) || "new"}`;
    const pack = localStorage.getItem("mc_selected_pack");
    const packNum = pack ? Number(pack) : 0;
    const finalPack = packNum > 0 ? packNum : selectedPack;

    handleRegisterAccount(finalUsername, finalPack);
  };

  // Step 4: Sign Session Key Contract
  const handleSignSessionKey = async () => {
    setSigningSessionKey(true);
    setSessionKeyError(null);
    try {
      console.log("[Onboarding] Signing session key contract...");
      
      // Store smart account address if present
      if (smartAccountAddress) {
        localStorage.setItem("mc_smart_account", smartAccountAddress);
      }

      // Grant permissions / generate session key
      let granted = await grantPermissions();

      // If grantPermissions failed or was not available, call session-keys API directly
      if (!granted) {
        const expiry = Math.floor(Date.now() / 1000) + 86400 * 30; // 30 days
        const res = await api["session-keys"].generate.$post({
          json: {
            permissionsContext: address || "0x",
            expiry,
            scopes: [
              "registerUser",
              "updateUsername",
              "createMemory",
              "updateMemory",
              "archiveMemory",
              "createAgent",
              "updateAgent",
              "archiveAgent",
              "createChat",
              "buyCredits",
              "linkMemory",
              "recordAudit",
            ],
          },
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.message || "Failed to generate session key");
        }
      }

      console.log("[Onboarding] Session key signed and active!");
      localStorage.setItem("mc_session_key_active", "true");

      if (onComplete) {
        onComplete();
      }
    } catch (err: any) {
      console.error("[Onboarding] Session key error:", err.message);
      setSessionKeyError(err.message || "Error signing session key contract");
    } finally {
      setSigningSessionKey(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-5rem)] px-4">
      <div className="w-full max-w-lg">
        {/* Step 1: SIWE (Sign In With Ethereum) */}
        {step === "siwe" && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">draw</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Bienvenido a MemoryChain</h1>
              <p className="text-muted-foreground text-sm">
                Conecta tu wallet y firma el acceso SIWE para ingresar.
              </p>
            </div>

            {!isConnected ? (
              <div className="flex justify-center pt-2">
                <ConnectButton label="Conectar Wallet" showBalance={false} chainStatus="none" accountStatus="address" />
              </div>
            ) : (
              <div className="space-y-3 pt-2">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleSiweLogin}
                  disabled={siweLoading}
                >
                  {siweLoading ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                      Firmando SIWE...
                    </>
                  ) : (
                    "Firmar Acceso (SIWE)"
                  )}
                </Button>
              </div>
            )}

            {siweError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg text-center">
                {siweError}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Credits (Initial MC Purchase) */}
        {step === "credits" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-1">Elige tu plan inicial</h2>
              <p className="text-sm text-muted-foreground">
                Los créditos (MC) se usan para crear memorias, agentes y ejecutar consultas.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.amount}
                  onClick={() => {
                    setSelectedPack(pack.amount);
                    console.log("[Onboarding] Pack selected:", pack.amount, "MC");
                  }}
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
                  setStep("username");
                }}
              >
                Saltar
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Username & Account Registration */}
        {step === "username" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-foreground mb-1">Elige tu username</h2>
              <p className="text-sm text-muted-foreground">Configura tu identidad en el registro on-chain.</p>
            </div>
            <div>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="MiUsername"
                className="text-center text-lg h-12"
                maxLength={30}
                disabled={registering}
              />
              {username && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Tu perfil será registrado como <span className="font-medium text-foreground">{username}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button className="flex-1" size="lg" onClick={handleCompleteUsername} disabled={registering}>
                {registering ? "Registrando..." : "Registrar Cuenta"}
              </Button>
            </div>
            {registerError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg text-center">
                {registerError}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Signing Session Key Contract */}
        {step === "session-key" && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-primary">key</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Firmar Contrato Session Key</h2>
              <p className="text-sm text-muted-foreground">
                Autoriza una clave de sesión para interactuar de forma fluida y sin interrupciones con los contratos.
              </p>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleSignSessionKey}
              disabled={signingSessionKey}
            >
              {signingSessionKey ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                  Firmando Session Key...
                </>
              ) : (
                "Firmar Session Key Contract"
              )}
            </Button>
            {sessionKeyError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg text-center">
                {sessionKeyError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
