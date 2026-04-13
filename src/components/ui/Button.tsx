"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "ghost"
    | "destructive"
    | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-spiceup-accent/50 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary:
        "bg-spiceup-accent hover:bg-spiceup-accent-hover text-white shadow-lg shadow-spiceup-accent/15",
      secondary:
        "bg-spiceup-surface border border-spiceup-border hover:border-spiceup-accent/30 text-white",
      ghost:
        "text-spiceup-text-secondary hover:text-white hover:bg-white/5",
      destructive:
        "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20",
      outline:
        "border border-spiceup-border hover:border-spiceup-accent/50 text-white bg-transparent",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-sm gap-1.5",
      md: "px-5 py-3 text-sm gap-2",
      lg: "px-8 py-4 text-base gap-2.5",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
