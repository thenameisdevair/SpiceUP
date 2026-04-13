"use client";

import { ArrowUpRight, ArrowDownLeft, Lock, Zap, Gift, ArrowRightLeft, Landmark } from "lucide-react";
import { motion } from "framer-motion";
import { type TxRecord } from "@/lib/txHistory";
import { formatBalance, formatTimestamp, shortenAddress } from "@/lib/format";
import { PrivacyBadge } from "@/components/PrivacyBadge";

/** Label and icon config for earn-specific tx types */
const EARN_TX_CONFIG: Record<
  string,
  { label: string; icon: typeof Zap; colorClass: string }
> = {
  stake: { label: "Staked", icon: Zap, colorClass: "text-spiceup-accent bg-spiceup-accent/10" },
  unstake: { label: "Unstaked", icon: Zap, colorClass: "text-spiceup-warning bg-spiceup-warning/10" },
  claim_rewards: { label: "Rewards", icon: Gift, colorClass: "text-spiceup-success bg-spiceup-success/10" },
  dca_create: { label: "DCA Created", icon: ArrowRightLeft, colorClass: "text-spiceup-warning bg-spiceup-warning/10" },
  lend_deposit: { label: "Deposited", icon: Landmark, colorClass: "text-spiceup-success bg-spiceup-success/10" },
  lend_withdraw: { label: "Withdrawn", icon: Landmark, colorClass: "text-spiceup-accent bg-spiceup-accent/10" },
};

function isEarnTx(type: string): boolean {
  return type in EARN_TX_CONFIG;
}

interface TransactionItemProps {
  tx: TxRecord;
  /** Animation delay index */
  index?: number;
}

export function TransactionItem({ tx, index = 0 }: TransactionItemProps) {
  const isSend = tx.type === "send";
  const isReceive = tx.type === "receive";
  const isPrivate = tx.isPrivate;
  const isEarn = isEarnTx(tx.type);

  const earnConfig = isEarn ? EARN_TX_CONFIG[tx.type] : null;
  const EarnIcon = earnConfig?.icon ?? Zap;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-spiceup-surface border border-spiceup-border rounded-xl p-4 flex items-center gap-3 hover:border-spiceup-border/80 transition-colors"
    >
      {/* Direction icon */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
          isEarn
            ? earnConfig!.colorClass
            : isSend
              ? "bg-spiceup-accent/10"
              : "bg-spiceup-success/10"
        }`}
      >
        {isEarn ? (
          <EarnIcon size={18} className={earnConfig!.colorClass.split(" ")[0]} />
        ) : isPrivate ? (
          <Lock
            size={18}
            className={isSend ? "text-spiceup-accent" : "text-spiceup-success"}
          />
        ) : isSend ? (
          <ArrowUpRight size={18} className="text-spiceup-accent" />
        ) : (
          <ArrowDownLeft size={18} className="text-spiceup-success" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-white text-sm font-medium truncate">
            {isEarn
              ? `${earnConfig!.label} ${tx.token}`
              : isSend
                ? `Sent ${tx.token}`
                : `Received ${tx.token}`}
          </p>
          {isPrivate && <PrivacyBadge label="Private" size="sm" />}
        </div>
        <p className="text-spiceup-text-muted text-xs mt-0.5 truncate">
          {isEarn
            ? shortenAddress(tx.counterparty, 6)
            : shortenAddress(tx.counterparty, 4)}
        </p>
      </div>

      {/* Amount & timestamp */}
      <div className="text-right shrink-0">
        <p
          className={`text-sm font-semibold ${
            isEarn
              ? earnConfig!.colorClass.split(" ")[0]
              : isSend
                ? "text-white"
                : "text-spiceup-success"
          }`}
        >
          {isEarn
            ? `${formatBalance(tx.amount)} ${tx.token}`
            : `${isSend ? "-" : "+"}${formatBalance(tx.amount)}`}
        </p>
        <p className="text-spiceup-text-muted text-[10px] mt-0.5">
          {formatTimestamp(tx.timestamp)}
        </p>
      </div>
    </motion.div>
  );
}
