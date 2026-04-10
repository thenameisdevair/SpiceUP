import { create } from "zustand";
import type { TongoConfidential, ConfidentialRecipient } from "starkzap";
import type { OnboardResult } from "starkzap";

type Status = "idle" | "initializing" | "ready" | "error";

interface AuthState {
  status: Status;
  error: string | null;

  privyUserId: string | null;
  starknetAddress: string | null;
  tongoRecipientId: ConfidentialRecipient | null;

  // Instances (not persisted — rebuilt on each session)
  wallet: OnboardResult | null;
  tongo: TongoConfidential | null;

  setStatus: (s: Status, error?: string | null) => void;
  setIdentity: (p: {
    privyUserId: string;
    starknetAddress: string;
    tongoRecipientId: ConfidentialRecipient;
    wallet: OnboardResult;
    tongo: TongoConfidential;
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
  setStatus: (status, error = null) => set({ status, error }),
  setIdentity: (p) => set({ ...p, status: "ready", error: null }),
  reset: () =>
    set({
      status: "idle",
      error: null,
      privyUserId: null,
      starknetAddress: null,
      tongoRecipientId: null,
      wallet: null,
      tongo: null,
    }),
}));
