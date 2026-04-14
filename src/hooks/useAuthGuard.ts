"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth";

const ANON_PATHS = ["/login", "/otp"];
const SETUP_PATHS = ["/phone", "/onboard"];

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
  const privyUserId = useAuthStore((s) => s.privyUserId);

  useEffect(() => {
    // Wait until auth initialization is complete
    if (status === "initializing") return;

    const isAnonPath = ANON_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    const isSetupPath = SETUP_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );
    const isProtectedPath = !isAnonPath && !isSetupPath && pathname !== "/";

    if (status === "ready" && privyUserId && isAnonPath) {
      // Authenticated user on an auth page → redirect to home
      router.replace("/home");
    } else if (
      (status === "idle" || status === "error") &&
      !privyUserId &&
      (isProtectedPath || isSetupPath)
    ) {
      // Unauthenticated user on a protected or setup page → redirect to login
      router.replace("/login");
    }
  }, [status, privyUserId, pathname, router]);
}
