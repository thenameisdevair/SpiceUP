"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

const FORWARD_PATHS = ["/login", "/otp"];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready, authenticated } = usePrivy();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready || !authenticated) return;
    if (FORWARD_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
      router.replace("/phone");
    }
  }, [ready, authenticated, pathname, router]);

  return (
    <div className="min-h-screen bg-shell">
      <div className="max-w-6xl mx-auto px-5 py-5 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.82, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 340, damping: 24 }}
              className="grid h-11 w-11 place-items-center rounded-[1.2rem] border border-spiceup-border bg-spiceup-surface shadow-[0_18px_45px_-24px_var(--color-spiceup-glow)]"
            >
              <span className="font-display text-lg font-bold text-spiceup-text-primary">
                S
              </span>
            </motion.div>
            <div>
              <p className="font-display text-lg font-bold text-spiceup-text-primary">
                SpiceUP
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-spiceup-text-muted">
                Split. Send. Return.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </header>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
          <section className="hidden lg:block pr-10">
            <div className="inline-flex items-center rounded-full border border-spiceup-border bg-spiceup-surface px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-spiceup-text-muted">
              For shared money and long-distance care
            </div>
            <h1 className="mt-6 max-w-[11ch] font-display text-6xl font-bold leading-[0.92] text-spiceup-text-primary">
              The money app people want to come back to.
            </h1>
            <p className="mt-6 max-w-[54ch] text-base leading-7 text-spiceup-text-secondary">
              Built for friend groups splitting real-life bills and diaspora users
              sending support home. Fast first impression, clear actions, and a
              premium feel that earns repeat use.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Attractive on first look",
                "Simple when money is moving",
                "Rewarding enough to reopen",
              ].map((point) => (
                <div
                  key={point}
                  className="rounded-[1.35rem] border border-spiceup-border bg-spiceup-surface px-4 py-4 text-sm font-medium text-spiceup-text-primary"
                >
                  {point}
                </div>
              ))}
            </div>
          </section>

          <section className="panel-sheen rounded-[2rem] border border-spiceup-border p-5 shadow-[0_40px_90px_-48px_rgba(0,0,0,0.35)] sm:p-8">
            {children}
          </section>
        </div>

        <footer className="mt-10 text-center text-[11px] uppercase tracking-[0.18em] text-spiceup-text-muted">
          {new Date().getFullYear()} SpiceUP • Starknet web app
        </footer>
      </div>
    </div>
  );
}
