/**
 * Earn Store (Zustand)
 * Manages state for staking, DCA, and lending features
 */

import { create } from "zustand";
import type {
  StakerPool,
  StakedPosition,
  AppDcaOrder,
  AppLendingMarket,
  AppLendingPosition,
} from "@/lib/earn";

interface StakingState {
  pools: StakerPool[];
  positions: StakedPosition[];
  loading: boolean;
  error: string | null;
}

interface DcaState {
  orders: AppDcaOrder[];
  loading: boolean;
  error: string | null;
}

interface LendingState {
  markets: AppLendingMarket[];
  positions: AppLendingPosition[];
  loading: boolean;
  error: string | null;
}

interface EarnState {
  staking: StakingState;
  dca: DcaState;
  lending: LendingState;

  // Staking actions
  setStakingPools: (pools: StakerPool[]) => void;
  setStakedPositions: (positions: StakedPosition[]) => void;
  setStakingLoading: (loading: boolean) => void;
  setStakingError: (error: string | null) => void;

  // DCA actions
  setDcaOrders: (orders: AppDcaOrder[]) => void;
  setDcaLoading: (loading: boolean) => void;
  setDcaError: (error: string | null) => void;

  // Lending actions
  setLendingMarkets: (markets: AppLendingMarket[]) => void;
  setLendingPositions: (positions: AppLendingPosition[]) => void;
  setLendingLoading: (loading: boolean) => void;
  setLendingError: (error: string | null) => void;

  // Reset all
  resetEarn: () => void;
}

const initialStaking: StakingState = {
  pools: [],
  positions: [],
  loading: false,
  error: null,
};

const initialDca: DcaState = {
  orders: [],
  loading: false,
  error: null,
};

const initialLending: LendingState = {
  markets: [],
  positions: [],
  loading: false,
  error: null,
};

export const useEarnStore = create<EarnState>((set) => ({
  staking: { ...initialStaking },
  dca: { ...initialDca },
  lending: { ...initialLending },

  // Staking
  setStakingPools: (pools) =>
    set((s) => ({ staking: { ...s.staking, pools } })),
  setStakedPositions: (positions) =>
    set((s) => ({ staking: { ...s.staking, positions } })),
  setStakingLoading: (loading) =>
    set((s) => ({ staking: { ...s.staking, loading } })),
  setStakingError: (error) =>
    set((s) => ({ staking: { ...s.staking, error } })),

  // DCA
  setDcaOrders: (orders) =>
    set((s) => ({ dca: { ...s.dca, orders } })),
  setDcaLoading: (loading) =>
    set((s) => ({ dca: { ...s.dca, loading } })),
  setDcaError: (error) =>
    set((s) => ({ dca: { ...s.dca, error } })),

  // Lending
  setLendingMarkets: (markets) =>
    set((s) => ({ lending: { ...s.lending, markets } })),
  setLendingPositions: (positions) =>
    set((s) => ({ lending: { ...s.lending, positions } })),
  setLendingLoading: (loading) =>
    set((s) => ({ lending: { ...s.lending, loading } })),
  setLendingError: (error) =>
    set((s) => ({ lending: { ...s.lending, error } })),

  resetEarn: () =>
    set({
      staking: { ...initialStaking },
      dca: { ...initialDca },
      lending: { ...initialLending },
    }),
}));
