"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount } from "wagmi";
import { useSiwe } from "~~/src/modules/auth/hooks/useSiwe";
import { useGlobalState } from "~~/services/store/store";
import { SharedBotAvatar } from "./SharedBotAvatar";

const NAV_LINKS = [
  { name: "Chat", href: "/chat" },
  { name: "Memorias", href: "/memories" },
  { name: "Agentes", href: "/agents" },
];

export function SharedAppHeader() {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { session, login, logout, loading } = useSiwe();
  const { creditBalance } = useGlobalState();

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className="w-full z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
      <div className="flex justify-between items-center h-16 px-6 md:px-12 max-w-7xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-foreground">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
            <SharedBotAvatar size="sm" />
          </div>
          <span>MemoryChain</span>
        </Link>

        {/* Nav Links */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                isActive(link.href)
                  ? "font-medium text-foreground border-b-2 border-primary pb-0.5"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Wallet & Auth Section */}
        <div className="flex items-center gap-3">
          {!isConnected ? (
            <ConnectButton label="Conectar Wallet" />
          ) : !session.isAuthenticated ? (
            <button
              type="button"
              onClick={login}
              disabled={loading}
              className="py-1.5 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/95 transition-all shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="animate-spin h-3 w-3 border-2 border-primary-foreground border-t-transparent rounded-full" />
              ) : (
                <span className="material-symbols-outlined text-sm">draw</span>
              )}
              <span>Firma SIWE</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {/* Credit Balance */}
              <Link
                href="/credits"
                className="text-xs font-mono text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 hover:bg-emerald-100 transition-all"
              >
                <span className="material-symbols-outlined text-sm">token</span>
                <span className="font-bold">{creditBalance} MC</span>
              </Link>
              <span className="text-xs font-mono text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg hidden sm:inline flex items-center gap-1.5 font-bold">
                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                SIWE Activo
              </span>
              <button
                type="button"
                onClick={logout}
                disabled={loading}
                className="py-1.5 px-3 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:bg-accent/80 transition-all border border-border/30"
              >
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
