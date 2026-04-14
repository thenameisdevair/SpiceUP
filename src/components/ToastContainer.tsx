"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from "lucide-react";
import { useToastStore, type ToastType } from "@/stores/toast";

const TOAST_STYLES: Record<
  ToastType,
  { icon: typeof CheckCircle2; bg: string; border: string; iconColor: string }
> = {
  success: {
    icon: CheckCircle2,
    bg: "bg-spiceup-success/10",
    border: "border-spiceup-success/30",
    iconColor: "text-spiceup-success",
  },
  error: {
    icon: XCircle,
    bg: "bg-spiceup-error/10",
    border: "border-spiceup-error/30",
    iconColor: "text-spiceup-error",
  },
  info: {
    icon: Info,
    bg: "bg-spiceup-accent/10",
    border: "border-spiceup-accent/30",
    iconColor: "text-spiceup-accent",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-spiceup-warning/10",
    border: "border-spiceup-warning/30",
    iconColor: "text-spiceup-warning",
  },
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 w-full max-w-sm px-4 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type];
          const Icon = style.icon;

          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`${style.bg} border ${style.border} backdrop-blur-xl rounded-2xl p-3.5 shadow-xl pointer-events-auto w-full panel-sheen`}
            >
              <div className="flex items-start gap-3">
                <Icon size={18} className={style.iconColor + " shrink-0 mt-0.5"} />
                <div className="flex-1 min-w-0">
                  <p className="text-spiceup-text-primary text-sm font-medium">{toast.title}</p>
                  {toast.message && (
                    <p className="text-spiceup-text-secondary text-xs mt-0.5">
                      {toast.message}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-spiceup-text-muted hover:text-spiceup-text-primary transition-colors shrink-0 p-0.5 -m-0.5"
                  aria-label="Dismiss"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
