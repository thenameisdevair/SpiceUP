"use client";

import { motion } from "framer-motion";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-spiceup-bg flex flex-col">
      {/* Auth Header */}
      <header className="px-6 pt-6 pb-2">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2.5">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-spiceup-accent to-spiceup-accent/60 flex items-center justify-center shadow-lg shadow-spiceup-accent/20"
            >
              <span className="text-white text-sm font-bold">S</span>
            </motion.div>
            <span className="text-white font-bold text-lg tracking-tight">
              Spice<span className="text-spiceup-accent">UP</span>
            </span>
          </div>
        </div>
      </header>

      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      {/* Footer */}
      <footer className="px-6 pb-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-spiceup-text-muted text-xs">
            &copy; {new Date().getFullYear()} SpiceUP · Built on Starknet
          </p>
        </div>
      </footer>
    </div>
  );
}
