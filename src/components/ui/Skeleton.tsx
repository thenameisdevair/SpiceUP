"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
  /** Width (CSS value) */
  width?: string;
  /** Height (CSS value) */
  height?: string;
  /** Shape variant */
  variant?: "text" | "circular" | "rectangular";
  /** Additional CSS classes */
  className?: string;
}

export function Skeleton({
  width,
  height,
  variant = "text",
  className,
}: SkeletonProps) {
  const baseStyles = "animate-pulse bg-spiceup-border rounded";

  const variantStyles = {
    text: "h-4 w-full rounded-md",
    circular: "rounded-full",
    rectangular: "rounded-xl",
  };

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], className)}
      style={{
        width: width || (variant === "circular" ? height || "40px" : "100%"),
        height: height || (variant === "circular" ? width || "40px" : undefined),
      }}
      aria-hidden="true"
    />
  );
}

/** Pre-built skeleton for a balance card */
export function BalanceCardSkeleton() {
  return (
    <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-6 space-y-4">
      <Skeleton width="80px" height="14px" />
      <Skeleton width="140px" height="32px" />
      <Skeleton width="100px" height="14px" />
    </div>
  );
}

/** Pre-built skeleton for a transaction list */
export function TransactionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-spiceup-surface border border-spiceup-border rounded-xl p-4 flex items-center gap-4"
        >
          <Skeleton variant="circular" width="40px" height="40px" />
          <div className="flex-1 space-y-2">
            <Skeleton width="60%" height="14px" />
            <Skeleton width="40%" height="12px" />
          </div>
          <Skeleton width="60px" height="14px" />
        </div>
      ))}
    </div>
  );
}
