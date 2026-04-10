// stores/toast.ts
import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info";

interface ToastState {
  message: string;
  variant: ToastVariant;
  visible: boolean;
  show: (message: string, variant?: ToastVariant) => void;
  hide: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  message: "",
  variant: "info",
  visible: false,
  show: (message, variant = "info") =>
    set({ message, variant, visible: true }),
  hide: () => set({ visible: false }),
}));
