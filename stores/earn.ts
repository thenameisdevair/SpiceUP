import { create } from "zustand";
import type { LendingMarket } from "starkzap";
import type { StakerPool, StakedPosition, AppDcaOrder, AppLendingPosition } from "@/lib/earn";

interface EarnState {
  // Staking
  pools: StakerPool[];
  stakedPositions: StakedPosition[];
  poolsLoading: boolean;
  poolsError: string | null;

  // DCA
  dcaOrders: AppDcaOrder[];
  dcaLoading: boolean;
  dcaError: string | null;

  // Lending
  lendingPositions: AppLendingPosition[];
  lendingMarkets: LendingMarket[];
  lendingLoading: boolean;
  lendingError: string | null;

  // Metadata
  lastUpdated: number | null;

  // Actions
  setPools: (pools: StakerPool[]) => void;
  setStakedPositions: (positions: StakedPosition[]) => void;
  setPoolsLoading: (v: boolean) => void;
  setPoolsError: (e: string | null) => void;
  setDcaOrders: (orders: AppDcaOrder[]) => void;
  setDcaLoading: (v: boolean) => void;
  setDcaError: (e: string | null) => void;
  setLendingPositions: (positions: AppLendingPosition[]) => void;
  setLendingMarkets: (markets: LendingMarket[]) => void;
  setLendingLoading: (v: boolean) => void;
  setLendingError: (e: string | null) => void;
  markUpdated: () => void;
}

export const useEarnStore = create<EarnState>((set) => ({
  pools: [],
  stakedPositions: [],
  poolsLoading: false,
  poolsError: null,

  dcaOrders: [],
  dcaLoading: false,
  dcaError: null,

  lendingPositions: [],
  lendingMarkets: [],
  lendingLoading: false,
  lendingError: null,

  lastUpdated: null,

  setPools:            (pools)     => set({ pools }),
  setStakedPositions:  (positions) => set({ stakedPositions: positions }),
  setPoolsLoading:     (v)         => set({ poolsLoading: v }),
  setPoolsError:       (e)         => set({ poolsError: e }),
  setDcaOrders:        (orders)    => set({ dcaOrders: orders }),
  setDcaLoading:       (v)         => set({ dcaLoading: v }),
  setDcaError:         (e)         => set({ dcaError: e }),
  setLendingPositions: (positions) => set({ lendingPositions: positions }),
  setLendingMarkets:   (markets)   => set({ lendingMarkets: markets }),
  setLendingLoading:   (v)         => set({ lendingLoading: v }),
  setLendingError:     (e)         => set({ lendingError: e }),
  markUpdated:         ()          => set({ lastUpdated: Date.now() }),
}));
