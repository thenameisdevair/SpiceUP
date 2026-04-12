// __tests__/stores/earn.test.ts
import { useEarnStore } from "@/stores/earn";

beforeEach(() => {
  useEarnStore.setState({
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
  });
});

describe("useEarnStore", () => {
  it("initializes with empty arrays and no errors", () => {
    const state = useEarnStore.getState();
    expect(state.pools).toEqual([]);
    expect(state.stakedPositions).toEqual([]);
    expect(state.dcaOrders).toEqual([]);
    expect(state.lendingPositions).toEqual([]);
    expect(state.lendingMarkets).toEqual([]);
    expect(state.poolsLoading).toBe(false);
    expect(state.dcaLoading).toBe(false);
    expect(state.lendingLoading).toBe(false);
  });

  // -- Staking --
  it("setPools sets the pools array", () => {
    const mockPool = { address: "0x1", apy: 5.5 } as any;
    useEarnStore.getState().setPools([mockPool]);
    expect(useEarnStore.getState().pools).toEqual([mockPool]);
  });

  it("setStakedPositions sets positions", () => {
    const mockPos = { poolAddress: "0x1", staked: 100 } as any;
    useEarnStore.getState().setStakedPositions([mockPos]);
    expect(useEarnStore.getState().stakedPositions).toEqual([mockPos]);
  });

  it("setPoolsLoading / setPoolsError work correctly", () => {
    useEarnStore.getState().setPoolsLoading(true);
    expect(useEarnStore.getState().poolsLoading).toBe(true);

    useEarnStore.getState().setPoolsError("timeout");
    expect(useEarnStore.getState().poolsError).toBe("timeout");
  });

  // -- DCA --
  it("setDcaOrders sets the DCA orders array", () => {
    const mockOrder = { id: "o1", frequency: "P1D" } as any;
    useEarnStore.getState().setDcaOrders([mockOrder]);
    expect(useEarnStore.getState().dcaOrders).toEqual([mockOrder]);
  });

  it("setDcaLoading / setDcaError work correctly", () => {
    useEarnStore.getState().setDcaLoading(true);
    expect(useEarnStore.getState().dcaLoading).toBe(true);

    useEarnStore.getState().setDcaError("no provider");
    expect(useEarnStore.getState().dcaError).toBe("no provider");
  });

  // -- Lending --
  it("setLendingPositions / setLendingMarkets work correctly", () => {
    const mockPos = { token: "ETH", deposited: 1.5 } as any;
    const mockMarket = { address: "0x1", apy: 3.2 } as any;

    useEarnStore.getState().setLendingPositions([mockPos]);
    useEarnStore.getState().setLendingMarkets([mockMarket]);

    expect(useEarnStore.getState().lendingPositions).toEqual([mockPos]);
    expect(useEarnStore.getState().lendingMarkets).toEqual([mockMarket]);
  });

  it("setLendingLoading / setLendingError work correctly", () => {
    useEarnStore.getState().setLendingLoading(true);
    expect(useEarnStore.getState().lendingLoading).toBe(true);

    useEarnStore.getState().setLendingError("Vesu down");
    expect(useEarnStore.getState().lendingError).toBe("Vesu down");
  });

  // -- Metadata --
  it("markUpdated sets lastUpdated to a recent timestamp", () => {
    const before = Date.now();
    useEarnStore.getState().markUpdated();
    const ts = useEarnStore.getState().lastUpdated!;
    expect(ts).toBeGreaterThanOrEqual(before);
  });
});
