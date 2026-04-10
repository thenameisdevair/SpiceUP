// hooks/useToast.ts
import { useToastStore, type ToastVariant } from "@/stores/toast";

export function useToast() {
  const show = useToastStore((s) => s.show);
  return {
    show:    (message: string, variant?: ToastVariant) => show(message, variant),
    success: (message: string) => show(message, "success"),
    error:   (message: string) => show(message, "error"),
    info:    (message: string) => show(message, "info"),
  };
}
