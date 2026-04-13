"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { formatBalance, toFiat } from "@/lib/format";
import { motion } from "framer-motion";

interface BalanceCardProps {
  /** Token symbol (e.g., "ETH", "STRK", "USDC") */
  symbol: string;
  /** Full token name (e.g., "Ether", "Starknet Token") */
  name: string;
  /** Token balance as string (e.g., "0.5") */
  amount: string | null;
  /** 2-letter abbreviation for the token icon */
  abbr: string;
  /** Background color class for the icon circle */
  color: string;
  /** Whether to show loading state */
  loading?: boolean;
}

export function BalanceCard({
  symbol,
  name,
  amount,
  abbr,
  color,
  loading = false,
}: BalanceCardProps) {
  const [visible, setVisible] = useState(true);

  if (loading) {
    return (
      <div className="bg-spiceup-surface border border-spiceup-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-spiceup-border animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-16 bg-spiceup-border rounded animate-pulse" />
            <div className="h-5 w-24 bg-spiceup-border rounded animate-pulse" />
          </div>
          <div className="h-4 w-12 bg-spiceup-border rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-spiceup-surface border border-spiceup-border rounded-xl p-4 group hover:border-spiceup-border/80 transition-colors"
    >
      <div className="flex items-center gap-3">
        {/* Token icon */}
        <div
          className={`w-10 h-10 rounded-full ${color} flex items-center justify-center shrink-0`}
        >
          <span className="text-xs font-bold text-white">{abbr}</span>
        </div>

        {/* Token info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold text-sm">{symbol}</p>
            <p className="text-spiceup-text-muted text-xs truncate">{name}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-white font-bold text-base">
              {visible && amount ? formatBalance(amount) : "••••••"}
            </p>
            <p className="text-spiceup-text-muted text-xs">
              {visible && amount ? toFiat(amount, symbol) : ""}
            </p>
          </div>
        </div>

        {/* Eye toggle */}
        <button
          onClick={() => setVisible(!visible)}
          className="text-spiceup-text-muted hover:text-white transition-colors p-1 -m-1"
          aria-label={visible ? "Hide balance" : "Show balance"}
        >
          {visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </button>
      </div>
    </motion.div>
  );
}
