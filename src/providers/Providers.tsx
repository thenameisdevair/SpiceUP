"use client";

import type { ReactNode } from "react";
import { PrivyProvider } from "./PrivyProvider";
import { QueryProvider } from "./QueryProvider";
import { ThemeProvider } from "./ThemeProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <PrivyProvider>
        <QueryProvider>{children}</QueryProvider>
      </PrivyProvider>
    </ThemeProvider>
  );
}
