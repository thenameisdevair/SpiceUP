import { create } from "zustand";

export interface TokenBalance {
  symbol: string;
  amount: string;
  decimals: number;
  formatted: string;
}

interface ConfidentialState {
  balance: string;
  pending: string;
  nonce: number;
}

interface WalletState {
  /** Public token balances */
  balances: Record<string, TokenBalance | null>;
  /** Confidential (Tongo) balance state */
  confidential: ConfidentialState | null;
  /** Whether Tongo is available */
  confidentialAvailable: boolean;
  lastUpdated: number | null;
  loading: boolean;
  error: string | null;

  setBalance: (symbol: string, balance: TokenBalance) => void;
  setBalances: (balances: Record<string, TokenBalance | null>) => void;
  setConfidential: (state: ConfidentialState) => void;
  setConfidentialUnavailable: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  markUpdated: () => void;
  reset: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  balances: {
    ETH: null,
    STRK: null,
    USDC: null,
  },
  confidential: null,
  confidentialAvailable: true,
  lastUpdated: null,
  loading: false,
  error: null,

  setBalance: (symbol, balance) =>
    set((s) => ({ balances: { ...s.balances, [symbol]: balance } })),
  setBalances: (balances) => set({ balances }),
  setConfidential: (state) => set({ confidential: state }),
  setConfidentialUnavailable: () =>
    set({ confidentialAvailable: false }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  markUpdated: () => set({ lastUpdated: Date.now() }),
  reset: () =>
    set({
      balances: { ETH: null, STRK: null, USDC: null },
      confidential: null,
      confidentialAvailable: true,
      lastUpdated: null,
      loading: false,
      error: null,
    }),
}));
