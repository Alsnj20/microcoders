"use client";

import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { api } from "~~/services/api/client";
import { useGlobalState } from "~~/services/store/store";
import { ThemeToggle } from "~~/src/modules/home/components/ui/theme-toggle";

const CREDIT_PACKS = [
  { amount: 50, price: "0.005", label: "Starter", description: "Para empezar" },
  { amount: 100, price: "0.01", label: "Regular", description: "Uso regular" },
  { amount: 200, price: "0.02", label: "Pro", description: "Power user" },
];

function getPlanName(balance: number): string {
  if (balance >= 200) return "Pro";
  if (balance >= 100) return "Regular";
  if (balance >= 50) return "Starter";
  return "Free";
}

function getPlanMax(balance: number): number {
  if (balance >= 200) return 200;
  if (balance >= 100) return 100;
  if (balance >= 50) return 50;
  return 50;
}

export default function ProfilePage() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const { creditBalance, setCreditBalance, session } = useGlobalState();
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);
  const [smartAccount, setSmartAccount] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState("0");

  const selectedPack = CREDIT_PACKS.find(p => p.amount === amount);
  const planName = selectedPack ? selectedPack.label : amount > 0 ? "Personalizado" : "Free";
  const planMax = getPlanMax(creditBalance);
  const barPercent = Math.min(100, (creditBalance / planMax) * 100);

  const refreshBalance = async () => {
    try {
      const res = await api.credits.balance.$get();
      if (res.ok) {
        const data = await res.json();
        setCreditBalance(data.balance ?? 0);
        if (data.account) setSmartAccount(data.account);
        if (data.ethBalance) setEthBalance(data.ethBalance);
      }
    } catch {}
  };

  const refreshBalanceOnMount = () => { refreshBalance(); };
  const ethBalanceNum = Number(ethBalance) / 1e18;

  useEffect(() => {
    if (session.isAuthenticated) {
      refreshBalanceOnMount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.isAuthenticated]);

  const handlePurchase = async () => {
    if (!address) return;

    // Pre-flight: the smart account must have enough ETH for value + gas.
    const selected = selectedPack;
    const packPrice = selected ? Number(selected.price) : 0;
    const minEth = packPrice + 0.002; // price + gas buffer
    if (ethBalanceNum < minEth) {
      setError(`Tu smart account necesita fondos para pagar la compra. Envía al menos ${minEth.toFixed(4)} ETH a tu smart account (${smartAccount ?? "ver perfil"}) y recarga.`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.credits.buy.$post({ json: { amount } });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to purchase credits");
      }
      setSuccess(true);
      await refreshBalance();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = () => {
    localStorage.clear();
    disconnect();
    window.location.reload();
  };

  const truncatedAddress = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "—";

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Wallet Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Perfil</h2>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            {/*<span className="material-symbols-outlined text-primary text-2xl">account_balance_wallet</span>*/}
            <span className="material-symbols-outlined text-sm text-primary">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{session.username || "Usuario"}</p>
            <p className="text-xs text-muted-foreground font-mono">{truncatedAddress}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={copyAddress}>
            <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
            {copied ? "Copiado" : "Copiar dirección"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-destructive hover:text-destructive"
            onClick={handleDisconnect}
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Desconectar
          </Button>
        </div>
      </div>

      {/* Credits Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Créditos</h2>

        {/* Balance */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">Balance actual</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-3xl font-bold text-primary">{creditBalance}</p>
              <span className="text-lg font-medium text-muted-foreground">MC</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">token</span>
          </div>
        </div>

        {smartAccount && (
          <div className="mb-4 p-3 rounded-lg bg-muted border border-border">
            <p className="text-xs text-muted-foreground mb-1">
              Saldo de tu smart account (paga operaciones)
            </p>
            <p className="text-sm font-medium text-foreground">{ethBalanceNum.toFixed(5)} ETH</p>
            {ethBalanceNum < 0.01 && (
              <p className="text-xs text-amber-600 mt-1">
                Saldo bajo. Envía ETH a tu smart account para poder comprar y operar:
              </p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-muted-foreground truncate">{smartAccount}</span>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => { navigator.clipboard.writeText(smartAccount); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
              >
                <span className="material-symbols-outlined text-sm">{copied ? "check" : "content_copy"}</span>
              </Button>
            </div>
          </div>
        )}

        <div className="h-2 bg-border rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${barPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs text-muted-foreground">
            Plan: <span className="font-medium text-foreground">{getPlanName(creditBalance)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {creditBalance} / {planMax} MC
          </p>
        </div>

        {/* Purchase */}
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Comprar créditos</h3>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {CREDIT_PACKS.map(pack => (
              <button
                key={pack.amount}
                type="button"
                onClick={() => setAmount(pack.amount)}
                className={`p-3 rounded-xl border text-center transition-all ${
                  amount === pack.amount
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="text-xs font-medium text-muted-foreground">{pack.label}</p>
                <p className="text-xl font-bold text-foreground mt-1">{pack.amount}</p>
                <p className="text-xs text-muted-foreground">MC</p>
                <p className="text-xs text-primary font-medium mt-1">{pack.price} ETH</p>
              </button>
            ))}
          </div>

          <div className="mb-4">
            <label htmlFor="custom-amount" className="block text-xs font-medium text-muted-foreground mb-1.5">
              Cantidad personalizada
            </label>
            <Input
              id="custom-amount"
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
            />
          </div>

          {error && <div className="mb-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

          {success && (
            <div className="mb-3 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm">
              ¡Créditos comprados! Balance actualizado.
            </div>
          )}

          <Button className="w-full" size="lg" onClick={handlePurchase} disabled={loading || amount <= 0}>
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : (
              <span className="material-symbols-outlined">shopping_cart</span>
            )}
            Comprar {amount} MC
          </Button>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">MemoryChain</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Protocolo descentralizado para la propiedad del conocimiento en IA.</p>
          <p className="text-xs">Versión 1.0.0 · Arbitrum Stylus</p>
        </div>
        <div className="flex gap-3 mt-4">
          <a
            href="https://github.com/Alsnj20/microcoders"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            GitHub
          </a>
          {/*<a
            href="https://discord.com"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline"
          >
            Discord
          </a>
          <a href="/debug" className="text-xs text-primary hover:underline">
            Debug
          </a>*/}
        </div>
      </div>
    </div>
  );
}
