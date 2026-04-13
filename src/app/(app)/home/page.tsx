"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { useBalance } from "@/hooks/useBalance";
import { useConfidentialBalance } from "@/hooks/useConfidentialBalance";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { BalanceCard } from "@/components/BalanceCard";
import { ConfidentialBalanceCard } from "@/components/ConfidentialBalanceCard";
import { TransactionItem } from "@/components/TransactionItem";
import {
  TransactionListSkeleton,
  BalanceCardSkeleton,
} from "@/components/ui/Skeleton";
import { formatTimestamp } from "@/lib/format";
import { PrivacyBadge } from "@/components/PrivacyBadge";

/** Get time-of-day greeting */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Categorize timestamp into "Today", "Yesterday", or formatted date */
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

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

export default function HomeDashboardPage() {
  const router = useRouter();
  const displayName = useAuthStore((s) => s.displayName);
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const tongoRecipientId = useAuthStore((s) => s.tongoRecipientId);

  const { balances, loading: balanceLoading } = useBalance();
  const {
    confidential,
    confidentialAvailable,
    loading: confLoading,
  } = useConfidentialBalance();
  const { transactions, loaded: txLoaded } = useTransactionHistory();
  const setConfidential = useWalletStore((s) => s.setConfidential);

  const [showBalances, setShowBalances] = useState(true);
  const [rollingOver, setRollingOver] = useState(false);

  // Compute total portfolio value (mock: ETH * 3000 + STRK * 0.8 + USDC * 1)
  const portfolioValue = useMemo(() => {
    if (balanceLoading) return null;
    const eth = parseFloat(balances.ETH?.amount ?? "0") * 3000;
    const strk = parseFloat(balances.STRK?.amount ?? "0") * 0.8;
    const usdc = parseFloat(balances.USDC?.amount ?? "0");
    return eth + strk + usdc;
  }, [balances, balanceLoading]);

  // Compute total token balance sum
  const totalTokenBalance = useMemo(() => {
    if (balanceLoading) return null;
    const eth = parseFloat(balances.ETH?.amount ?? "0");
    const strk = parseFloat(balances.STRK?.amount ?? "0");
    const usdc = parseFloat(balances.USDC?.amount ?? "0");
    return { eth, strk, usdc };
  }, [balances, balanceLoading]);

  const hasBalances = !balanceLoading;

  // Group transactions by date
  const groupedTx = useMemo(() => {
    if (!txLoaded || transactions.length === 0) return [];

    const groups: { label: string; txs: typeof transactions }[] = [];
    let currentLabel = "";

    for (const tx of transactions) {
      const label = getDateLabel(tx.timestamp);
      if (label !== currentLabel) {
        groups.push({ label, txs: [tx] });
        currentLabel = label;
      } else {
        groups[groups.length - 1].txs.push(tx);
      }
    }
    return groups;
  }, [transactions, txLoaded]);

  // Fund handler — navigate to /fund
  const handleFund = useCallback(() => {
    router.push("/fund");
  }, [router]);

  // Withdraw handler — navigate to /withdraw
  const handleWithdraw = useCallback(() => {
    router.push("/withdraw");
  }, [router]);

  // Rollover handler — mock activate pending balance
  const handleRollover = useCallback(() => {
    if (rollingOver) return;
    setRollingOver(true);

    // Simulate 2-second rollover
    setTimeout(() => {
      const pending = parseFloat(confidential?.pending ?? "0");
      const current = parseFloat(confidential?.balance ?? "0");
      const newBalance = current + pending;

      setConfidential({
        balance: newBalance.toFixed(4),
        pending: "0.0000",
        nonce: (confidential?.nonce ?? 0) + 1,
      });

      setRollingOver(false);
    }, 2000);
  }, [rollingOver, confidential, setConfidential]);

  const greeting = getGreeting();
  const ethBalance = balances.ETH?.amount ?? "0";

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-8">
      <motion.div variants={stagger} initial="hidden" animate="show">
        {/* Header */}
        <motion.div
          variants={fadeUp}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <p className="text-spiceup-text-secondary text-sm">
              {greeting}
              {displayName ? `, ${displayName}` : ""}
            </p>
            <h1 className="text-white text-xl font-bold tracking-tight">
              SpiceUP
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="w-10 h-10 rounded-xl bg-spiceup-surface border border-spiceup-border flex items-center justify-center text-spiceup-text-muted hover:text-white hover:border-spiceup-accent/30 transition-all"
              aria-label={showBalances ? "Hide balances" : "Show balances"}
            >
              {showBalances ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-spiceup-accent to-spiceup-accent/60 flex items-center justify-center shadow-lg shadow-spiceup-accent/15">
              <span className="text-sm font-bold text-white">
                {displayName?.charAt(0)?.toUpperCase() || "S"}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Total Portfolio Value Card */}
        <motion.div
          variants={fadeUp}
          className="bg-gradient-to-br from-spiceup-accent via-spiceup-accent/90 to-purple-700/80 rounded-2xl p-6 mb-6 relative overflow-hidden shadow-xl shadow-spiceup-accent/15"
        >
          {/* Decorative elements */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-white/5 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/70 text-sm font-medium">
                Total Portfolio
              </p>
              <div className="flex items-center gap-2">
                <PrivacyBadge label="Sepolia" size="sm" />
                <button
                  className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all"
                  aria-label="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>
            <p className="text-white text-3xl font-bold tracking-tight mb-1.5">
              {hasBalances && showBalances && portfolioValue !== null ? (
                <>
                  $
                  {portfolioValue.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </>
              ) : (
                "••••••••"
              )}
            </p>
            {totalTokenBalance && showBalances ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1">
                  <div className="w-4 h-4 rounded-full bg-blue-500/30 flex items-center justify-center">
                    <span className="text-[7px] font-bold text-blue-300">
                      ET
                    </span>
                  </div>
                  <span className="text-white/80 text-xs font-medium">
                    {totalTokenBalance.eth.toFixed(4)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1">
                  <div className="w-4 h-4 rounded-full bg-purple-500/30 flex items-center justify-center">
                    <span className="text-[7px] font-bold text-purple-300">
                      ST
                    </span>
                  </div>
                  <span className="text-white/80 text-xs font-medium">
                    {totalTokenBalance.strk.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1">
                  <div className="w-4 h-4 rounded-full bg-green-500/30 flex items-center justify-center">
                    <span className="text-[7px] font-bold text-green-300">
                      $
                    </span>
                  </div>
                  <span className="text-white/80 text-xs font-medium">
                    {totalTokenBalance.usdc.toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-white/60 text-sm">•••</p>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-4 gap-2.5 mb-6"
        >
          {[
            {
              icon: ArrowUpRight,
              label: "Send",
              href: "/send",
              color: "text-spiceup-accent",
              bg: "bg-spiceup-accent/10",
            },
            {
              icon: ArrowDownLeft,
              label: "Receive",
              href: "/receive",
              color: "text-spiceup-success",
              bg: "bg-spiceup-success/10",
            },
            {
              icon: TrendingUp,
              label: "Earn",
              href: "/earn",
              color: "text-spiceup-warning",
              bg: "bg-spiceup-warning/10",
            },
            {
              icon: ShieldCheck,
              label: "Private",
              href: "/fund",
              color: "text-purple-400",
              bg: "bg-purple-400/10",
            },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="bg-spiceup-surface border border-spiceup-border rounded-xl py-3.5 flex flex-col items-center gap-2 hover:border-spiceup-accent/30 transition-all active:scale-[0.97]"
            >
              <div
                className={`w-10 h-10 ${action.bg} rounded-xl flex items-center justify-center`}
              >
                <action.icon size={18} className={action.color} />
              </div>
              <span className="text-white text-xs font-medium">
                {action.label}
              </span>
            </Link>
          ))}
        </motion.div>

        {/* Token Balance Cards */}
        <motion.div variants={fadeUp} className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-semibold text-sm">Your Assets</h2>
            {starknetAddress && (
              <div className="flex items-center gap-1.5 text-spiceup-text-muted">
                <Wallet size={12} />
                <span className="text-xs font-mono">
                  {starknetAddress.slice(0, 6)}...{starknetAddress.slice(-4)}
                </span>
              </div>
            )}
          </div>
          {balanceLoading ? (
            <div className="grid gap-3">
              <BalanceCardSkeleton />
              <BalanceCardSkeleton />
              <BalanceCardSkeleton />
            </div>
          ) : (
            <div className="grid gap-3">
              {[
                {
                  symbol: "ETH",
                  name: "Ether",
                  amount: showBalances
                    ? balances.ETH?.amount ?? null
                    : null,
                  abbr: "ET",
                  color: "bg-blue-500/20",
                  usd:
                    showBalances && totalTokenBalance
                      ? `$${(totalTokenBalance.eth * 3000).toLocaleString("en-US", { maximumFractionDigits: 0 })}`
                      : null,
                },
                {
                  symbol: "STRK",
                  name: "Starknet Token",
                  amount: showBalances
                    ? balances.STRK?.amount ?? null
                    : null,
                  abbr: "ST",
                  color: "bg-purple-500/20",
                  usd:
                    showBalances && totalTokenBalance
                      ? `$${(totalTokenBalance.strk * 0.8).toFixed(2)}`
                      : null,
                },
                {
                  symbol: "USDC",
                  name: "USD Coin",
                  amount: showBalances
                    ? balances.USDC?.amount ?? null
                    : null,
                  abbr: "$C",
                  color: "bg-green-500/20",
                  usd:
                    showBalances && totalTokenBalance
                      ? `$${totalTokenBalance.usdc.toFixed(2)}`
                      : null,
                },
              ].map((token, i) => (
                <motion.div
                  key={token.symbol}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.2 + i * 0.06,
                    type: "spring",
                    stiffness: 300,
                    damping: 25,
                  }}
                >
                  <BalanceCard
                    symbol={token.symbol}
                    name={token.name}
                    amount={token.amount}
                    abbr={token.abbr}
                    color={token.color}
                  />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Confidential Balance Card */}
        <motion.div variants={fadeUp} className="mb-6">
          <ConfidentialBalanceCard
            balance={showBalances ? confidential?.balance ?? null : null}
            pending={confidential?.pending ?? null}
            nonce={confidential?.nonce ?? null}
            available={confidentialAvailable}
            loading={confLoading}
            onFund={handleFund}
            onWithdraw={handleWithdraw}
            rollingOver={rollingOver}
            onRollover={handleRollover}
          />
        </motion.div>

        {/* Recent Transactions */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">
              Recent Activity
            </h2>
            {transactions.length > 5 && (
              <button className="text-spiceup-text-muted text-xs hover:text-spiceup-accent transition-colors flex items-center gap-1">
                View All
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {!txLoaded ? (
            <TransactionListSkeleton count={3} />
          ) : transactions.length === 0 ? (
            <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-spiceup-accent/10 flex items-center justify-center mx-auto mb-4">
                <TrendingUp size={24} className="text-spiceup-accent" />
              </div>
              <p className="text-spiceup-text-secondary text-sm font-medium mb-1">
                No transactions yet
              </p>
              <p className="text-spiceup-text-muted text-xs leading-relaxed">
                Send or receive your first payment to get started
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedTx.slice(0, 3).map((group, gi) => (
                <div key={group.label}>
                  <p className="text-spiceup-text-muted text-[11px] font-medium uppercase tracking-wider mb-2.5 px-1">
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {group.txs.slice(0, 3).map((tx, i) => (
                      <TransactionItem
                        key={tx.id}
                        tx={tx}
                        index={gi * 3 + i}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
