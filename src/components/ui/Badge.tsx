"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "accent" | "success" | "warning" | "error";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
  size?: "sm" | "md";
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-white/10 text-spiceup-text-secondary",
  accent: "bg-spiceup-accent/15 text-spiceup-accent",
  success: "bg-spiceup-success/15 text-spiceup-success",
  warning: "bg-spiceup-warning/15 text-spiceup-warning",
  error: "bg-spiceup-error/15 text-spiceup-error",
};

export function Badge({
  children,
  variant = "default",
  className,
  size = "sm",
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        variantStyles[variant],
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs",
        className
      )}
    >
      {children}
    </span>
  );
}
