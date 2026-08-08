"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { useGlobalState } from "~~/services/store/store";
import { api } from "~~/services/api/client";

const CREDIT_PACKS = [
  { amount: 50, price: "0.005", label: "Plan Starter", description: "Para empezar" },
  { amount: 100, price: "0.01", label: "Plan Regular", description: "Uso regular" },
  { amount: 200, price: "0.02", label: "Plan Pro", description: "Power user" },
];

function getPlanName(balance: number): string {
  if (balance >= 200) return "Plan Pro";
  if (balance >= 100) return "Plan Regular";
  if (balance >= 50) return "Plan Starter";
  return "Plan Free";
}

function getPlanMax(balance: number): number {
  if (balance >= 200) return 200;
  if (balance >= 100) return 100;
  if (balance >= 50) return 50;
  return 50;
}

export default function CreditsPage() {
  const { address } = useAccount();
  const { creditBalance, setCreditBalance } = useGlobalState();
  const [amount, setAmount] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedPack = CREDIT_PACKS.find((p) => p.amount === amount);
  const planName = selectedPack ? selectedPack.label : amount > 0 ? "Plan personalizado" : "Plan Free";
  const planMax = getPlanMax(creditBalance);
  const barPercent = Math.min(100, (creditBalance / planMax) * 100);

  const refreshBalance = async () => {
    try {
      const res = await api.credits.balance.$get();
      if (res.ok) {
        const data = await res.json();
        setCreditBalance(data.balance ?? 0);
      }
    } catch {}
  };

  const handlePurchase = async () => {
    if (!address) return;
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await api.credits.buy.$post({
        json: { amount },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to purchase credits");
      }

      setSuccess(true);
      await refreshBalance();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Purchase failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Créditos MemoryChain</h1>

      {/* Current Balance + Plan */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
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
        <div className="h-2 bg-border rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${barPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Plan actual: <span className="font-medium text-foreground">{getPlanName(creditBalance)}</span>
          </p>
          <p className="text-xs text-muted-foreground">{creditBalance} / {planMax} MC</p>
        </div>
      </div>

      {/* Purchase Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-1">Comprar créditos</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Selecciona un plan o ingresa una cantidad personalizada.
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.amount}
              onClick={() => setAmount(pack.amount)}
              className={`p-4 rounded-xl border text-center transition-all ${
                amount === pack.amount
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <p className="text-xs font-medium text-muted-foreground">{pack.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{pack.amount}</p>
              <p className="text-xs text-muted-foreground">MC</p>
              <p className="text-xs text-primary font-medium mt-2">{pack.price} ETH</p>
            </button>
          ))}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cantidad personalizada</label>
          <Input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
          />
        </div>

        <div className="mb-4 p-3 rounded-lg bg-muted/50 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Plan seleccionado</span>
          <span className="text-sm font-semibold text-foreground">{planName}</span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm">
            ¡Créditos comprados! Balance actualizado.
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={handlePurchase}
          disabled={loading || amount <= 0}
        >
          {loading ? (
            <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <span className="material-symbols-outlined">shopping_cart</span>
          )}
          Comprar {amount} MC
        </Button>
      </div>
    </div>
  );
}
