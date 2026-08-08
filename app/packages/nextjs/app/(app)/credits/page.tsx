"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useGlobalState } from "~~/services/store/store";
import { api } from "~~/services/api/client";

export default function CreditsPage() {
  const { address } = useAccount();
  const { creditBalance } = useGlobalState();
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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

      {/* Current Balance */}
      <div className="bg-card rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Balance actual</p>
            <p className="text-3xl font-bold text-primary">{creditBalance} MC</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary">token</span>
          </div>
        </div>
      </div>

      {/* Purchase Section */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold mb-4">Comprar créditos</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Los créditos se utilizan para operaciones en la red (crear memorias, agentes, ejecutar consultas).
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Cantidad</label>
          <div className="flex gap-2">
            {[10, 25, 50, 100].map(qty => (
              <button
                key={qty}
                onClick={() => setAmount(qty)}
                className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                  amount === qty
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary/50"
                }`}
              >
                {qty} MC
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">O ingresa cantidad personalizada</label>
          <input
            type="number"
            min={1}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 text-emerald-600 text-sm">
            ¡Créditos comprados exitosamente!
          </div>
        )}

        <button
          onClick={handlePurchase}
          disabled={loading || !address || amount <= 0}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
          ) : (
            <span className="material-symbols-outlined">shopping_cart</span>
          )}
          <span>Comprar {amount} MC</span>
        </button>

        {!address && (
          <p className="text-center text-sm text-muted-foreground mt-3">Conecta tu wallet para comprar</p>
        )}
      </div>
    </div>
  );
}
