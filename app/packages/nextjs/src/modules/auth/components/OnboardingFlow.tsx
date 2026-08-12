"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { type Hex } from "viem";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~~/components/ui/dialog";
import { api } from "~~/services/api/client";
import { useSmartAccount } from "~~/modules/smart-account/hooks/useSmartAccount";
import { getSmartAccountAddress } from "~~/modules/smart-account/utils/account";
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
  const publicClient = usePublicClient();
  const { login: siweLogin, loading: siweLoading, error: siweError, isAuthenticated: siweAuthenticated } = useSiwe();
  const { smartAccountAddress } = useSmartAccount();
  const [smartAccountForFunding, setSmartAccountForFunding] = useState<string | null>(null);
  const [smartAccountBalance, setSmartAccountBalance] = useState<string | null>(null);
  const [checkingFunds, setCheckingFunds] = useState(false);
  const [funding, setFunding] = useState(false);
  const [funded, setFunded] = useState(false);
  const [keyJustSigned, setKeyJustSigned] = useState(false);
  const [showFundModal, setShowFundModal] = useState(false);
  // True if a session key is already active (persisted) even after a reload.
  const keyAlreadyActive =
    typeof window !== "undefined" && localStorage.getItem("mc_session_key_active") === "true";
  const canContinue = (keyJustSigned || keyAlreadyActive) && funded;

  const checkSmartAccountFunds = async (accountAddr: string) => {
    if (!publicClient) return;
    setCheckingFunds(true);
    try {
      const bal = await publicClient.getBalance({ address: accountAddr as Hex });
      const eth = Number(bal) / 1e18;
      setSmartAccountBalance(eth.toFixed(6));
      setFunded(eth > 0);
    } catch {
      setSmartAccountBalance(null);
      setFunded(false);
    } finally {
      setCheckingFunds(false);
    }
  };

  // When entering the session-key step, load the stored smart account address
  // (owner = session key) so the user can fund it before UserOps start.
  useEffect(() => {
    if (startStep === "session-key") {
      const stored = localStorage.getItem("mc_smart_account");
      if (stored) {
        setSmartAccountForFunding(stored);
        void checkSmartAccountFunds(stored);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startStep]);

  // Read on-chain registration status. In production the user is registered as
  // their SMART ACCOUNT (the UserOp msg.sender), not the session key or wallet.
  const ownerCheck = localStorage.getItem("mc_smart_account") || localStorage.getItem("mc_session_key_address") || address;
  const { data: isRegistered } = useScaffoldReadContract({
    contractName: "UserRegistry",
    functionName: "isRegistered",
    args: [ownerCheck],
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
  const ensureSessionKey = async () => {
    // In production, writes go through the user's smart account via UserOps,
    // which require an active session key. Always ask the backend for an active
    // key (don't trust localStorage — it can be stale after a Redis reset).
    try {
      const listRes = await api["session-keys"].$get();
      const keys = listRes.ok ? ((await listRes.json()) as any).keys || [] : [];
      const activeKey = keys.find((k: any) => k.isActive && k.scopes?.includes("registerUser"));
      if (activeKey) {
        localStorage.setItem("mc_session_key_active", "true");
        // Re-sync the smart account from the ACTIVE session key (stale localStorage
        // may point to an old key → funding the wrong address → AA21 prefund).
        if (activeKey.sessionKeyAddress) {
          localStorage.setItem("mc_session_key_address", activeKey.sessionKeyAddress);
          try {
            if (publicClient) {
              const addr = await getSmartAccountAddress(publicClient, activeKey.sessionKeyAddress as Hex);
              if (addr) {
                localStorage.setItem("mc_smart_account", addr);
                setSmartAccountForFunding(addr);
              }
            }
          } catch {}
        }
        return;
      }
    } catch {
      // fall through to generate below
    }

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
          "restoreMemory",
          "createAgent",
          "updateAgent",
          "archiveAgent",
          "restoreAgent",
          "createChat",
          "updateChat",
          "archiveChat",
          "restoreChat",
          "linkMemory",
          "unlinkMemory",
          "changePriority",
          "disableLink",
          "enableLink",
          "buyCredits",
          "recordAudit",
        ],
      },
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      throw new Error(errBody?.message || "Failed to generate session key");
    }
    localStorage.setItem("mc_session_key_active", "true");
  };

  const handleRegisterAccount = async (regUsername: string, pack: number | null) => {
    setRegistering(true);
    setRegisterError(null);
    try {
      console.log("[Onboarding] Registering user on-chain:", regUsername);

      // Production: the register UserOp needs a session key — ensure it first.
      // This also re-syncs mc_smart_account from the ACTIVE session key.
      await ensureSessionKey();

      // Production: the smart account pays gas for UserOps. If it has no ETH,
      // the bundler will reject with AA21 (didn't pay prefund) — block early and
      // show the funding modal instead of a confusing error.
      const accountAddr = localStorage.getItem("mc_smart_account");
      const sessionKeyAddr = localStorage.getItem("mc_session_key_address");
      if (accountAddr && publicClient) {
        try {
          const bal = await publicClient.getBalance({ address: accountAddr as Hex });
          if (Number(bal) <= 0n) {
            console.warn("[Onboarding] Smart account not funded — opening funding modal");
            setSmartAccountForFunding(accountAddr);
            await checkSmartAccountFunds(accountAddr);
            setShowFundModal(true);
            setRegisterError(
              "Tu smart account no tiene fondos. Fondea la dirección para poder pagar el gas y luego registra.",
            );
            setRegistering(false);
            return;
          }
        } catch {}
      } else if (sessionKeyAddr && publicClient) {
        // No stored account — derive it from the session key (source of truth).
        try {
          const addr = await getSmartAccountAddress(publicClient, sessionKeyAddr as Hex);
          localStorage.setItem("mc_smart_account", addr);
          setSmartAccountForFunding(addr);
          await checkSmartAccountFunds(addr);
          const bal = await publicClient.getBalance({ address: addr as Hex });
          if (Number(bal) <= 0n) {
            setShowFundModal(true);
            setRegisterError(
              "Tu smart account no tiene fondos. Fondea la dirección para poder pagar el gas y luego registra.",
            );
            setRegistering(false);
            return;
          }
        } catch {}
      }

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

      // Reuse an existing active session key (its smart account may already be
      // funded/registered) instead of generating a brand new one every time.
      let keyData: any = null;
      try {
        const listRes = await api["session-keys"].$get();
        const keys = listRes.ok ? ((await listRes.json()) as any).keys || [] : [];
        const active = keys.find((k: any) => k.isActive);
        if (active?.sessionKeyAddress) {
          keyData = { sessionKeyAddress: active.sessionKeyAddress };
        }
      } catch {}

      if (!keyData) {
        // No active key yet — generate one via the backend (Option B). The backend
        // stores the private key AES-GCM encrypted in Redis and signs UserOps.
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
              "restoreMemory",
              "createAgent",
              "updateAgent",
              "archiveAgent",
              "restoreAgent",
              "createChat",
              "updateChat",
              "archiveChat",
              "restoreChat",
              "linkMemory",
              "unlinkMemory",
              "changePriority",
              "disableLink",
              "enableLink",
              "buyCredits",
              "recordAudit",
            ],
          },
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => null);
          throw new Error(errBody?.message || "Failed to generate session key");
        }
        keyData = await res.json();
      }

      // The smart account owner is the SESSION KEY address, not the wallet.
      // Store it so the correct smart account can be computed + funded.
      if (keyData.sessionKeyAddress) {
        localStorage.setItem("mc_session_key_address", keyData.sessionKeyAddress);
        // Compute the real smart account (owner = session key) and store it.
        try {
          if (publicClient) {
            const addr = await getSmartAccountAddress(publicClient, keyData.sessionKeyAddress as Hex);
            if (addr) {
              localStorage.setItem("mc_smart_account", addr);
              setSmartAccountForFunding(addr);
            }
          }
        } catch {}
      }

      console.log("[Onboarding] Session key signed and active!");
      localStorage.setItem("mc_session_key_active", "true");
      setKeyJustSigned(true);

      if (keyData.sessionKeyAddress && publicClient) {
        try {
          const addr = await getSmartAccountAddress(publicClient, keyData.sessionKeyAddress as Hex);
          if (addr) {
            localStorage.setItem("mc_smart_account", addr);
            setSmartAccountForFunding(addr);
            await checkSmartAccountFunds(addr);
          }
        } catch {}
      }

      setShowFundModal(true);
    } catch (err: any) {
      console.error("[Onboarding] Session key error:", err.message);
      setSessionKeyError(err.message || "Error signing session key contract");
    } finally {
      setSigningSessionKey(false);
    }
  };

  // Transfer a bit of Sepolia ETH from the user's EOA to their smart account so
  // it can pay gas for UserOps (production mode). Amount is configurable.
  const handleFundSmartAccount = async () => {
    if (!address || !smartAccountForFunding || !publicClient) return;
    setFunding(true);
    setSessionKeyError(null);
    try {
      const { sendTransaction } = await import("wagmi/actions");
      const { wagmiConfig } = await import("~~/services/web3/wagmiConfig");
      // Use LEGACY gas params (gasPrice) — some networks/endpoints reject
      // EIP-1559 fields, and explicit values avoid MetaMask's eth_estimateGas
      // call (the public RPC rate-limits it → misleading "not enough ETH").
      const hash = await sendTransaction(wagmiConfig, {
        to: smartAccountForFunding as Hex,
        value: BigInt("10000000000000000"), // 0.01 ETH
        gas: BigInt("60000"),
        gasPrice: BigInt("50000000"), // 0.05 gwei — generous for testnet
      });
      console.log("[Onboarding] Funding tx:", hash);
      // Wait a moment then re-check the balance
      await new Promise(r => setTimeout(r, 3000));
      await checkSmartAccountFunds(smartAccountForFunding);
    } catch (err: any) {
      console.error("[Onboarding] Funding error:", err.message);
      setSessionKeyError(err.message || "Error funding smart account");
    } finally {
      setFunding(false);
    }
  };

  const handleContinueAfterFunding = () => {
    if (!funded) return;
    if (onComplete) onComplete();
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
              disabled={signingSessionKey || keyJustSigned}
            >
              {signingSessionKey ? (
                <>
                  <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2" />
                  Firmando Session Key...
                </>
              ) : keyJustSigned ? (
                "Session Key Firmada ✓"
              ) : (
                "Firmar Session Key Contract"
              )}
            </Button>
            {sessionKeyError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg text-center">
                {sessionKeyError}
              </div>
            )}
            {keyJustSigned && (
              <div className="p-3 bg-primary/10 border border-primary/30 text-primary text-sm rounded-lg text-center">
                Session key firmada. Ahora fondea tu smart account para poder operar.
              </div>
            )}
            {(keyJustSigned || keyAlreadyActive) && funded && (
              <Button size="lg" className="w-full" onClick={handleContinueAfterFunding}>
                Continuar
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Modal: fund the smart account */}
      <Dialog open={showFundModal} onOpenChange={open => !open && setShowFundModal(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fondea tu Smart Account</DialogTitle>
            <DialogDescription>
              Tu wallet firma las operaciones, pero el gas se paga desde tu smart account. Envía ETH de Sepolia a esta dirección para poder operar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-primary/30 bg-primary/5">
              <p className="text-xs font-semibold text-muted-foreground tracking-wider mb-1">TU SMART ACCOUNT</p>
              <p className="text-sm font-mono break-all text-foreground">{smartAccountForFunding || smartAccountAddress}</p>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Balance de la smart account:</span>
              <span className="font-mono font-semibold text-foreground">
                {checkingFunds ? "verificando..." : smartAccountBalance ? `${smartAccountBalance} ETH` : "0 ETH"}
              </span>
            </div>

            {funded ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 text-sm rounded-lg text-center font-medium">
                ✓ Smart account fondeada correctamente
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Transfiere ETH desde tu wallet conectada a la dirección de arriba. Puedes hacerlo con el botón (0.01 ETH) o manualmente desde tu wallet.
              </p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigator.clipboard?.writeText(smartAccountForFunding || smartAccountAddress || "")}
              >
                Copiar dirección
              </Button>
              <Button
                className="flex-1"
                onClick={handleFundSmartAccount}
                disabled={funding || funded}
              >
                {funding ? "Enviando..." : funded ? "Fondeada ✓" : "Fondear 0.01 ETH"}
              </Button>
            </div>

            {funded && (
              <Button size="lg" className="w-full" onClick={() => { setShowFundModal(false); handleContinueAfterFunding(); }}>
                Continuar
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
