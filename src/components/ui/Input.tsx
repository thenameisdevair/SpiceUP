"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs uppercase tracking-[0.16em] text-spiceup-text-muted font-semibold"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-spiceup-text-muted">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full bg-spiceup-surface text-spiceup-text-primary rounded-2xl border border-spiceup-border shadow-[inset_0_1px_0_color-mix(in_oklch,var(--color-spiceup-text-primary)_6%,transparent)]",
              "placeholder:text-spiceup-text-muted",
              "focus:outline-none focus:border-spiceup-accent focus:ring-2 focus:ring-spiceup-accent/15",
              "transition-all",
              "py-3.5 px-4",
              icon && "pl-12",
              error && "border-red-500 focus:border-red-500 focus:ring-red-500/30",
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="text-red-400 text-xs mt-1">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
