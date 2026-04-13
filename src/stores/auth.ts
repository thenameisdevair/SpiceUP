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
  displayName: string | null;
  phoneNumber: string | null;

  setStatus: (s: AuthStatus, error?: string | null) => void;
  setIdentity: (p: {
    privyUserId: string;
    starknetAddress: string;
    tongoRecipientId: string;
    wallet: unknown;
    tongo: unknown;
    displayName?: string | null;
    phoneNumber?: string | null;
  }) => void;
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
  displayName: null,
  phoneNumber: null,

  setStatus: (status, error = null) => set({ status, error }),
  setIdentity: (p) =>
    set({
      ...p,
      status: "ready",
      error: null,
    }),
  reset: () =>
    set({
      status: "idle",
      error: null,
      privyUserId: null,
      starknetAddress: null,
      tongoRecipientId: null,
      wallet: null,
      tongo: null,
      displayName: null,
      phoneNumber: null,
    }),
}));
