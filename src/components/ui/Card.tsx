"use client";

import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
  /** Click handler — if provided, card becomes interactive */
  onClick?: () => void;
  /** Hover effect */
  hover?: boolean;
  /** Padding variant */
  padding?: "sm" | "md" | "lg";
}

export function Card({
  children,
  className,
  onClick,
  hover = false,
  padding = "md",
}: CardProps) {
  const paddings = {
    sm: "p-4",
    md: "p-5",
    lg: "p-6",
  };

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick();
            }
          : undefined
      }
      className={cn(
        "panel-sheen bg-spiceup-surface border border-spiceup-border rounded-[1.5rem] shadow-[0_24px_60px_-36px_rgba(0,0,0,0.35)]",
        paddings[padding],
        hover &&
          "hover:border-spiceup-accent/30 hover:bg-spiceup-surface/80 cursor-pointer transition-colors",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-start justify-between mb-4",
        className
      )}
    >
      <div>
        <h3 className="text-spiceup-text-primary font-semibold">{title}</h3>
        {subtitle && (
          <p className="text-spiceup-text-secondary text-sm mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
