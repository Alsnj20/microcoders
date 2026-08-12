import { create } from "zustand";
import scaffoldConfig from "~~/scaffold.config";
import { type ChainWithAttributes, NETWORKS_EXTRA_DATA } from "~~/utils/scaffold-stylus";

/**
 * Zustand Store
 *
 * You can add global state to the app using this useGlobalState, to get & set
 * values from anywhere in the app.
 *
 * Think about it as a global useState.
 */

type GlobalState = {
  targetNetwork: ChainWithAttributes;
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => void;

  // Session
  session: {
    address: string | null;
    chainId: number | null;
    username: string | null;
    isAuthenticated: boolean;
    kWallet: Uint8Array | null;
    kRecovery: Uint8Array | null;
  };
  setSession: (session: GlobalState["session"]) => void;

  // Session Key
  sessionKey: {
    id: string | null;
    address: string | null;
    expiry: number | null;
    isActive: boolean;
  };
  setSessionKey: (key: GlobalState["sessionKey"]) => void;

  // Provider Selection
  selectedProvider: string;
  setSelectedProvider: (provider: string) => void;

  // Credit Balance (Cached)
  creditBalance: number;
  setCreditBalance: (balance: number) => void;
};

export const useGlobalState = create<GlobalState>(set => ({
  targetNetwork: {
    ...scaffoldConfig.targetNetworks[0],
    ...NETWORKS_EXTRA_DATA[scaffoldConfig.targetNetworks[0].id],
  },
  setTargetNetwork: (newTargetNetwork: ChainWithAttributes) => set(() => ({ targetNetwork: newTargetNetwork })),

  // Initial Session State
  session: {
    address: null,
    chainId: null,
    username: null,
    isAuthenticated: false,
    kWallet: null,
    kRecovery: null,
  },
  setSession: session => set(() => ({ session })),

  // Initial Session Key State
  sessionKey: {
    id: null,
    address: null,
    expiry: null,
    isActive: false,
  },
  setSessionKey: sessionKey => set(() => ({ sessionKey })),

  // Default Provider
  selectedProvider: "openai:gpt-4o-mini",
  setSelectedProvider: selectedProvider => set(() => ({ selectedProvider })),

  // Default Credit Balance
  creditBalance: 0,
  setCreditBalance: creditBalance => set(() => ({ creditBalance })),
}));
