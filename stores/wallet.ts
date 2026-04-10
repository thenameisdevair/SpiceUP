import { create } from "zustand";
import type { Amount } from "starkzap";
import type { ConfidentialState } from "starkzap";

interface WalletState {
  // Public balances keyed by token symbol
  balances: {
    ETH: Amount | null;
    STRK: Amount | null;
    USDC: Amount | null;
  };

  // Confidential (Tongo) state
  confidential: ConfidentialState | null;
  confidentialAvailable: boolean; // false if tongoContract is 0x0

  // Metadata
  lastUpdated: number | null;
  loading: boolean;
  error: string | null;

  // Actions
  setBalance: (symbol: string, amount: Amount) => void;
  setConfidential: (state: ConfidentialState) => void;
  setConfidentialUnavailable: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markUpdated: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balances: { ETH: null, STRK: null, USDC: null },
  confidential: null,
  confidentialAvailable: true,
  lastUpdated: null,
  loading: false,
  error: null,

  setBalance: (symbol, amount) =>
    set((s) => ({
      balances: { ...s.balances, [symbol]: amount },
    })),
  setConfidential: (state) => set({ confidential: state }),
  setConfidentialUnavailable: () => set({ confidentialAvailable: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  markUpdated: () => set({ lastUpdated: Date.now() }),
}));
