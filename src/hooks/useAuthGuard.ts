"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

const PUBLIC_PATHS = ["/login", "/otp", "/phone", "/onboard"];

/**
 * Redirects unauthenticated users to /login.
 * Redirects authenticated users away from auth pages to /home.
 *
 * Only acts when the auth status is definitive (ready or idle),
 * not during initialization.
 */
export function useAuthGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const status = useAuthStore((s) => s.status);
  const starknetAddress = useAuthStore((s) => s.starknetAddress);

  useEffect(() => {
    // Wait until auth initialization is complete
    if (status === "initializing") return;

    const isAuthPage = PUBLIC_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    const isAppPage = !isAuthPage && pathname !== "/";

    if (status === "ready" && starknetAddress && isAuthPage) {
      // Authenticated user on an auth page → redirect to home
      router.replace("/home");
    } else if (
      (status === "idle" || status === "error") &&
      !starknetAddress &&
      isAppPage
    ) {
      // Unauthenticated user on an app page → redirect to login
      router.replace("/login");
    }
  }, [status, starknetAddress, pathname, router]);
}
