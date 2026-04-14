"use client";

import { PrivyProvider as BasePrivyProvider } from "@privy-io/react-auth";
import { useTheme } from "next-themes";
import { ENV } from "@/lib/env";
import { type ReactNode } from "react";

export function PrivyProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();

  if (typeof window === "undefined") {
    return <>{children}</>;
  }

  const privyTheme = resolvedTheme === "light" ? "light" : "dark";

  return (
    <BasePrivyProvider
      appId={ENV.PRIVY_APP_ID}
      config={{
        appearance: {
          theme: privyTheme,
          accentColor: "#ef6b4a",
          logo: undefined,
        },
        loginMethods: ["email", "google"],
        embeddedWallets: {
          ethereum: {
            createOnLogin: "off",
          },
          solana: {
            createOnLogin: "off",
          },
        },
      }}
    >
      {children}
    </BasePrivyProvider>
  );
}
