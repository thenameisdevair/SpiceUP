"use client";

import { ShieldCheck } from "lucide-react";

interface PrivacyBadgeProps {
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
  /** Label text — defaults to "Private" */
  label?: string;
}

export function PrivacyBadge({
  className = "",
  size = "sm",
  label = "Private",
}: PrivacyBadgeProps) {
  const iconSize = size === "sm" ? 12 : 14;
  const padding = size === "sm" ? "px-2 py-0.5" : "px-3 py-1";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1 ${padding} rounded-full bg-spiceup-accent/15 text-spiceup-accent font-medium ${textSize} ${className}`}
    >
      <ShieldCheck size={iconSize} />
      {label}
    </span>
  );
}
