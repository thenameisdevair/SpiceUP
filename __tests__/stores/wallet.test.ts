// __tests__/stores/wallet.test.ts
import { useWalletStore } from "@/stores/wallet";

beforeEach(() => {
  useWalletStore.setState({
    balances: { ETH: null, STRK: null, USDC: null },
    confidential: null,
    confidentialAvailable: true,
    lastUpdated: null,
    loading: false,
    error: null,
  });
});

describe("useWalletStore", () => {
  it("initializes with all balances null", () => {
    const state = useWalletStore.getState();
    expect(state.balances.ETH).toBeNull();
    expect(state.balances.STRK).toBeNull();
    expect(state.balances.USDC).toBeNull();
    expect(state.confidential).toBeNull();
    expect(state.loading).toBe(false);
  });

  it("setBalance updates one token without affecting others", () => {
    const mockAmount = { toFormatted: () => "1.5" } as any;
    useWalletStore.getState().setBalance("ETH", mockAmount);

    const state = useWalletStore.getState();
    expect(state.balances.ETH).toBe(mockAmount);
    expect(state.balances.STRK).toBeNull();
    expect(state.balances.USDC).toBeNull();
  });

  it("setBalance updates multiple tokens independently", () => {
    const ethAmount = { toFormatted: () => "1.0" } as any;
    const strkAmount = { toFormatted: () => "100.0" } as any;

    useWalletStore.getState().setBalance("ETH", ethAmount);
    useWalletStore.getState().setBalance("STRK", strkAmount);

    const state = useWalletStore.getState();
    expect(state.balances.ETH).toBe(ethAmount);
    expect(state.balances.STRK).toBe(strkAmount);
  });

  it("setConfidential sets the confidential state", () => {
    const mockState = { balance: 100n, pending: 0n, nonce: 1n } as any;
    useWalletStore.getState().setConfidential(mockState);
    expect(useWalletStore.getState().confidential).toBe(mockState);
  });

  it("setConfidentialUnavailable sets flag to false", () => {
    useWalletStore.getState().setConfidentialUnavailable();
    expect(useWalletStore.getState().confidentialAvailable).toBe(false);
  });

  it("setLoading toggles loading flag", () => {
    useWalletStore.getState().setLoading(true);
    expect(useWalletStore.getState().loading).toBe(true);
    useWalletStore.getState().setLoading(false);
    expect(useWalletStore.getState().loading).toBe(false);
  });

  it("setError sets and clears error", () => {
    useWalletStore.getState().setError("network failed");
    expect(useWalletStore.getState().error).toBe("network failed");
    useWalletStore.getState().setError(null);
    expect(useWalletStore.getState().error).toBeNull();
  });

  it("markUpdated sets lastUpdated to a recent timestamp", () => {
    const before = Date.now();
    useWalletStore.getState().markUpdated();
    const after = Date.now();
    const ts = useWalletStore.getState().lastUpdated!;
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});
