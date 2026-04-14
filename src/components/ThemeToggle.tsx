"use client";

import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-full border border-spiceup-border bg-spiceup-surface px-3 py-2 text-xs font-semibold text-spiceup-text-secondary transition-colors hover:border-spiceup-accent/35 hover:text-spiceup-text-primary"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? <SunMedium size={14} /> : <Moon size={14} />}
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
