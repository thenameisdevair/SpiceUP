"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Clock3, Send } from "lucide-react";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { TransactionItem } from "@/components/TransactionItem";
import { TransactionListSkeleton } from "@/components/ui/Skeleton";

function getDateLabel(timestamp: number): string {
  const now = new Date();
  const txDate = new Date(timestamp);

  const isToday =
    txDate.getDate() === now.getDate() &&
    txDate.getMonth() === now.getMonth() &&
    txDate.getFullYear() === now.getFullYear();

  if (isToday) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    txDate.getDate() === yesterday.getDate() &&
    txDate.getMonth() === yesterday.getMonth() &&
    txDate.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  return txDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function ActivityPage() {
  const { transactions, loaded } = useTransactionHistory();

  const groupedTx = useMemo(() => {
    if (!loaded || transactions.length === 0) return [];

    const groupsByDate: { label: string; txs: typeof transactions }[] = [];
    let currentLabel = "";

    for (const tx of transactions) {
      const label = getDateLabel(tx.timestamp);
      if (label !== currentLabel) {
        groupsByDate.push({ label, txs: [tx] });
        currentLabel = label;
      } else {
        groupsByDate[groupsByDate.length - 1].txs.push(tx);
      }
    }

    return groupsByDate;
  }, [loaded, transactions]);

  return (
    <div className="mx-auto max-w-3xl px-5 pt-5 pb-8 min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/home"
            className="text-spiceup-text-muted transition-colors hover:text-white"
            aria-label="Back home"
          >
            <ArrowLeft size={22} />
          </Link>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spiceup-text-muted">
              Activity
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-spiceup-text-primary">
              Full movement history
            </h1>
          </div>
        </div>

        {!loaded ? (
          <TransactionListSkeleton count={6} />
        ) : transactions.length === 0 ? (
          <div className="rounded-[1.8rem] border border-spiceup-border bg-spiceup-surface p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-spiceup-accent/10">
              <Clock3 size={24} className="text-spiceup-accent" />
            </div>
            <p className="mb-1 text-sm font-medium text-spiceup-text-secondary">
              No movement yet
            </p>
            <p className="mx-auto max-w-[34ch] text-xs leading-6 text-spiceup-text-muted">
              Your full history will appear here once you start sending,
              receiving, or settling group expenses.
            </p>
            <Link
              href="/send"
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-spiceup-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-spiceup-accent-hover"
            >
              <Send size={16} />
              Send first payment
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {groupedTx.map((group) => (
              <div key={group.label}>
                <p className="mb-2.5 px-1 text-[11px] font-medium uppercase tracking-wider text-spiceup-text-muted">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.txs.map((tx, index) => (
                    <TransactionItem key={tx.id} tx={tx} index={index} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
