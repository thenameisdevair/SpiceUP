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
      "inline-flex items-center justify-center font-medium rounded-2xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-spiceup-accent/40 disabled:opacity-50 disabled:pointer-events-none";

    const variants = {
      primary:
        "bg-spiceup-accent hover:bg-spiceup-accent-hover text-[var(--primary-foreground)] shadow-[0_18px_42px_-22px_var(--color-spiceup-glow)]",
      secondary:
        "bg-spiceup-surface border border-spiceup-border hover:border-spiceup-accent/35 hover:bg-spiceup-surface/90 text-spiceup-text-primary",
      ghost:
        "text-spiceup-text-secondary hover:text-spiceup-text-primary hover:bg-spiceup-surface/70",
      destructive:
        "bg-spiceup-error/12 border border-spiceup-error/20 text-spiceup-error hover:bg-spiceup-error/18",
      outline:
        "border border-spiceup-border hover:border-spiceup-accent/40 text-spiceup-text-primary bg-transparent",
    };

    const sizes = {
      sm: "px-3 py-2 text-sm gap-1.5",
      md: "px-5 py-3 text-sm gap-2",
      lg: "px-6 py-4 text-base gap-2.5",
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
