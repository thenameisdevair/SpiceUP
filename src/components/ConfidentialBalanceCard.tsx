"use client";

import { ShieldCheck, Plus, ArrowDownToLine, RefreshCw, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

interface ConfidentialBalanceCardProps {
  /** Confidential balance as formatted string */
  balance: string | null;
  /** Pending (in-flight) balance */
  pending: string | null;
  /** Nonce value */
  nonce: number | null;
  /** Whether Tongo is available */
  available: boolean;
  /** Loading state */
  loading?: boolean;
  /** Handler for Fund button click */
  onFund?: () => void;
  /** Handler for Withdraw button click */
  onWithdraw?: () => void;
  /** Whether rollover is in progress */
  rollingOver?: boolean;
  /** Handler for rollover button click */
  onRollover?: () => void;
}

export function ConfidentialBalanceCard({
  balance,
  pending,
  nonce,
  available = true,
  loading = false,
  onFund,
  onWithdraw,
  rollingOver = false,
  onRollover,
}: ConfidentialBalanceCardProps) {
  if (!available) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-spiceup-accent/10 to-spiceup-accent/5 border border-spiceup-accent/20 rounded-2xl p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck size={16} className="text-spiceup-accent" />
          <span className="text-white font-semibold text-sm">
            Confidential Balance
          </span>
          <PrivacyBadge label="ZK" size="sm" />
        </div>
        <p className="text-spiceup-text-muted text-sm">
          Confidential balances are not available yet
        </p>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-spiceup-accent/10 to-spiceup-accent/5 border border-spiceup-accent/20 rounded-2xl p-5">
        <Skeleton width="160px" height="18px" className="mb-3" />
        <Skeleton width="80px" height="28px" className="mb-2" />
        <Skeleton width="120px" height="14px" />
      </div>
    );
  }

  const hasPending = pending && parseFloat(pending) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-spiceup-accent/10 to-spiceup-accent/5 border border-spiceup-accent/20 rounded-2xl p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-spiceup-accent" />
          <span className="text-white font-semibold text-sm">
            Confidential Balance
          </span>
          <PrivacyBadge label="ZK" size="sm" />
        </div>
        <button
          onClick={onRollover}
          disabled={rollingOver || !hasPending}
          className="text-spiceup-text-muted hover:text-spiceup-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Rollover"
          title="Rollover pending balance"
        >
          <RefreshCw
            size={14}
            className={rollingOver ? "animate-spin" : ""}
          />
        </button>
      </div>

      {/* Balance */}
      <div className="mb-1">
        <p className="text-white text-2xl font-bold">
          {balance ?? "0.0000"}{" "}
          <span className="text-sm font-medium text-spiceup-text-secondary">
            STRK
          </span>
        </p>
      </div>

      {/* Pending & nonce */}
      <div className="flex items-center gap-3 mb-4">
        {hasPending && (
          <p className="text-spiceup-warning text-xs">
            {pending} pending
          </p>
        )}
        <p className="text-spiceup-text-muted text-xs">
          Nonce: {nonce ?? 0}
        </p>
      </div>

      {/* Pending rollover banner */}
      {hasPending && !rollingOver && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4"
        >
          <button
            onClick={onRollover}
            className="w-full flex items-center gap-2 bg-spiceup-accent/10 border border-spiceup-accent/20 rounded-xl px-4 py-3 text-left hover:bg-spiceup-accent/15 transition-colors"
          >
            <Zap size={14} className="text-spiceup-accent" />
            <span className="text-spiceup-accent text-xs font-medium flex-1">
              Activate pending balance
            </span>
            <RefreshCw size={12} className="text-spiceup-accent/60" />
          </button>
        </motion.div>
      )}

      {/* Rollover in progress */}
      {rollingOver && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mb-4"
        >
          <div className="w-full flex items-center gap-2 bg-spiceup-accent/10 border border-spiceup-accent/20 rounded-xl px-4 py-3">
            <RefreshCw size={14} className="text-spiceup-accent animate-spin" />
            <span className="text-spiceup-accent text-xs font-medium">
              Activating pending balance...
            </span>
          </div>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          variant="primary"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={onFund}
        >
          <Plus size={14} />
          Fund
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={onWithdraw}
        >
          <ArrowDownToLine size={14} />
          Withdraw
        </Button>
      </div>
    </motion.div>
  );
}
