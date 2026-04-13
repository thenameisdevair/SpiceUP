"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { TabBar } from "@/components/TabBar";
import { useAuthInit } from "@/hooks/useAuthInit";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAuthStore } from "@/stores/auth";
import { Skeleton } from "@/components/ui/Skeleton";

function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ type: "spring", stiffness: 400, damping: 35 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export default function AppLayout({ children }: { children: ReactNode }) {
  // Initialize auth on mount (restore session from localStorage)
  useAuthInit();

  // Guard: redirect unauthenticated users to /login
  useAuthGuard();

  const status = useAuthStore((s) => s.status);

  // Show loading state while initializing
  if (status === "initializing") {
    return (
      <div className="min-h-screen bg-spiceup-bg flex flex-col">
        <div className="flex-1 pb-20 max-w-2xl mx-auto w-full">
          <div className="px-5 pt-5">
            {/* Header skeleton */}
            <div className="flex items-center justify-between mb-6">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-lg" />
                <Skeleton className="h-6 w-20 rounded-lg" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
            {/* Balance card skeleton */}
            <Skeleton className="h-44 w-full rounded-2xl mb-6" />
            {/* Quick actions skeleton */}
            <div className="grid grid-cols-4 gap-3 mb-8">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
            {/* Activity skeleton */}
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-spiceup-bg flex flex-col">
      {/* Main Content */}
      <div className="flex-1 pb-20">
        <PageTransition>{children}</PageTransition>
      </div>

      {/* Bottom Tab Bar */}
      <TabBar />
    </div>
  );
}
