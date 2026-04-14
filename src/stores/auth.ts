import { create } from "zustand";

type AuthStatus = "idle" | "initializing" | "ready" | "error";

interface AuthState {
  status: AuthStatus;
  error: string | null;
  privyUserId: string | null;
  starknetAddress: string | null;
  tongoRecipientId: string | null;
  wallet: unknown | null;
  tongo: unknown | null;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;

  setStatus: (s: AuthStatus, error?: string | null) => void;
  setIdentity: (p: {
    privyUserId: string;
    starknetAddress?: string | null;
    tongoRecipientId?: string | null;
    wallet?: unknown | null;
    tongo?: unknown | null;
    email?: string | null;
    displayName?: string | null;
    phoneNumber?: string | null;
  }) => void;
  patchProfile: (
    p: Partial<
      Pick<
        AuthState,
        "email" | "displayName" | "phoneNumber" | "starknetAddress" | "tongoRecipientId"
      >
    >
  ) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "idle",
  error: null,
  privyUserId: null,
  starknetAddress: null,
  tongoRecipientId: null,
  wallet: null,
  tongo: null,
  email: null,
  displayName: null,
  phoneNumber: null,

  setStatus: (status, error = null) => set({ status, error }),
  setIdentity: (p) =>
    set({
      privyUserId: p.privyUserId,
      starknetAddress: p.starknetAddress ?? null,
      tongoRecipientId: p.tongoRecipientId ?? null,
      wallet: p.wallet ?? null,
      tongo: p.tongo ?? null,
      email: p.email ?? null,
      displayName: p.displayName ?? null,
      phoneNumber: p.phoneNumber ?? null,
      status: "ready",
      error: null,
    }),
  patchProfile: (patch) => set((state) => ({ ...state, ...patch })),
  reset: () =>
    set({
      status: "idle",
      error: null,
      privyUserId: null,
      starknetAddress: null,
      tongoRecipientId: null,
      wallet: null,
      tongo: null,
      email: null,
      displayName: null,
      phoneNumber: null,
    }),
}));
