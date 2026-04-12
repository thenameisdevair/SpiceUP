// __tests__/stores/auth.test.ts
import { useAuthStore } from "@/stores/auth";

// Reset store to initial state before each test
beforeEach(() => {
  useAuthStore.getState().reset();
});

describe("useAuthStore", () => {
  it('initializes with status "idle" and all fields null', () => {
    const state = useAuthStore.getState();
    expect(state.status).toBe("idle");
    expect(state.error).toBeNull();
    expect(state.privyUserId).toBeNull();
    expect(state.starknetAddress).toBeNull();
    expect(state.tongoRecipientId).toBeNull();
    expect(state.wallet).toBeNull();
    expect(state.tongo).toBeNull();
  });

  it("setStatus updates status and clears error by default", () => {
    useAuthStore.getState().setStatus("initializing");
    const state = useAuthStore.getState();
    expect(state.status).toBe("initializing");
    expect(state.error).toBeNull();
  });

  it("setStatus with error sets both fields", () => {
    useAuthStore.getState().setStatus("error", "something broke");
    const state = useAuthStore.getState();
    expect(state.status).toBe("error");
    expect(state.error).toBe("something broke");
  });

  it("setIdentity sets all fields and transitions to ready", () => {
    const mockWallet = { address: "0xabc" } as any;
    const mockTongo = { recipientId: { x: 1n, y: 2n } } as any;

    useAuthStore.getState().setIdentity({
      privyUserId: "privy-123",
      starknetAddress: "0xabc",
      tongoRecipientId: { x: 1n, y: 2n },
      wallet: mockWallet,
      tongo: mockTongo,
    });

    const state = useAuthStore.getState();
    expect(state.status).toBe("ready");
    expect(state.error).toBeNull();
    expect(state.privyUserId).toBe("privy-123");
    expect(state.starknetAddress).toBe("0xabc");
    expect(state.wallet).toBe(mockWallet);
    expect(state.tongo).toBe(mockTongo);
  });

  it("reset returns to initial state", () => {
    useAuthStore.getState().setIdentity({
      privyUserId: "privy-123",
      starknetAddress: "0xabc",
      tongoRecipientId: { x: 1n, y: 2n },
      wallet: {} as any,
      tongo: {} as any,
    });

    useAuthStore.getState().reset();
    const state = useAuthStore.getState();
    expect(state.status).toBe("idle");
    expect(state.privyUserId).toBeNull();
    expect(state.wallet).toBeNull();
    expect(state.tongo).toBeNull();
  });
});
