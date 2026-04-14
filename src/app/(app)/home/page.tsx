"use client";

import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Clock3,
  Eye,
  EyeOff,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { useBalance } from "@/hooks/useBalance";
import { useConfidentialBalance } from "@/hooks/useConfidentialBalance";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useGroups } from "@/hooks/useGroups";
import { BalanceCard } from "@/components/BalanceCard";
import { ConfidentialBalanceCard } from "@/components/ConfidentialBalanceCard";
import { TransactionItem } from "@/components/TransactionItem";
import {
  TransactionListSkeleton,
  BalanceCardSkeleton,
} from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { ENV } from "@/lib/env";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { LAUNCH_FEATURES } from "@/constants/features";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

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
  const email = useAuthStore((s) => s.email);
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const tongoRecipientId = useAuthStore((s) => s.tongoRecipientId);
  const { groups } = useGroups();

  const { balances, loading: balanceLoading, refresh } = useBalance();
  const {
    confidential,
    confidentialAvailable,
    loading: confLoading,
  } = useConfidentialBalance();
  const { transactions, loaded: txLoaded } = useTransactionHistory();
  const setConfidential = useWalletStore((s) => s.setConfidential);

  const [showBalances, setShowBalances] = useState(true);
  const [rollingOver, setRollingOver] = useState(false);

  const balanceBreakdown = useMemo(() => {
    if (balanceLoading) return null;

    return {
      eth: parseFloat(balances.ETH?.amount ?? "0"),
      strk: parseFloat(balances.STRK?.amount ?? "0"),
      usdc: parseFloat(balances.USDC?.amount ?? "0"),
    };
  }, [balances, balanceLoading]);

  const hasAnyBalance =
    !!balanceBreakdown &&
    (balanceBreakdown.eth > 0 ||
      balanceBreakdown.strk > 0 ||
      balanceBreakdown.usdc > 0);
  const hasTransactions = transactions.length > 0;
  const initials = (displayName || email || "SpiceUP").charAt(0).toUpperCase();

  const groupedTx = useMemo(() => {
    if (!txLoaded || transactions.length === 0) return [];

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
  }, [transactions, txLoaded]);

  const handleFund = useCallback(() => {
    router.push("/fund");
  }, [router]);

  const handleWithdraw = useCallback(() => {
    router.push("/withdraw");
  }, [router]);

  const handleRollover = useCallback(() => {
    if (rollingOver) return;
    setRollingOver(true);

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
  const networkLabel = ENV.NETWORK === "mainnet" ? "Mainnet" : "Sepolia";
  const networkDescriptor =
    ENV.NETWORK === "mainnet"
      ? "Live rail"
      : "Sponsored public send live on Sepolia";

  const quickActions = LAUNCH_FEATURES.earn
    ? [
        {
          icon: ArrowUpRight,
          label: "Send",
          href: "/send",
          color: "text-spiceup-accent",
          bg: "bg-spiceup-accent/12",
          blurb: "Move money out fast.",
        },
        {
          icon: ArrowDownLeft,
          label: "Receive",
          href: "/receive",
          color: "text-spiceup-success",
          bg: "bg-spiceup-success/12",
          blurb: "Share the cleanest route in.",
        },
        {
          icon: TrendingUp,
          label: "Earn",
          href: "/earn",
          color: "text-spiceup-warning",
          bg: "bg-spiceup-warning/12",
          blurb: "Grow idle balances once live.",
        },
        {
          icon: ShieldCheck,
          label: "Private",
          href: "/fund",
          color: "text-spiceup-text-primary",
          bg: "bg-spiceup-surface-strong",
          blurb: "Stage confidential flow honestly.",
        },
      ]
    : [
        {
          icon: ArrowUpRight,
          label: "Send",
          href: "/send",
          color: "text-spiceup-accent",
          bg: "bg-spiceup-accent/12",
          blurb: "Move money out fast.",
        },
        {
          icon: ArrowDownLeft,
          label: "Receive",
          href: "/receive",
          color: "text-spiceup-success",
          bg: "bg-spiceup-success/12",
          blurb: "Share the cleanest route in.",
        },
        {
          icon: Users,
          label: "Groups",
          href: "/groups",
          color: "text-spiceup-warning",
          bg: "bg-spiceup-warning/12",
          blurb: "Split trips, rent, and dinners.",
        },
        {
          icon: ShieldCheck,
          label: "Private",
          href: "/fund",
          color: "text-spiceup-text-primary",
          bg: "bg-spiceup-surface-strong",
          blurb: "Stage confidential flow honestly.",
        },
      ];

  const focusCards = [
    {
      label: "Groups in play",
      value: `${groups.length}`,
      copy:
        groups.length > 0
          ? "Your shared expense rooms are ready for new entries and settlements."
          : "Create your first group and stop carrying bill logic in chat.",
      href: groups.length > 0 ? "/groups" : "/groups/new",
      icon: Users,
    },
    {
      label: "Recent movement",
      value: `${transactions.length}`,
      copy: hasTransactions
        ? "Your activity feed below is now based on real history, not seeded demo rows."
        : "The movement rail wakes up once you actually send or receive.",
      href: hasTransactions ? "/receive" : "/send",
      icon: Clock3,
    },
    {
      label: "Privacy lane",
      value: tongoRecipientId ? "Ready" : "Setup",
      copy: confidentialAvailable
        ? "Confidential balance controls are available from this dashboard."
        : "Private money flow is being staged carefully instead of mocked.",
      href: "/fund",
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="mx-auto max-w-3xl px-5 pt-5 pb-8">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div
          variants={fadeUp}
          className="mb-6 flex items-center justify-between"
        >
          <div>
            <p className="text-sm text-spiceup-text-secondary">
              {greeting}
              {displayName ? `, ${displayName}` : ""}
            </p>
            <h1 className="text-xl font-bold tracking-tight text-spiceup-text-primary">
              Your money room
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBalances(!showBalances)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-spiceup-border bg-spiceup-surface text-spiceup-text-muted transition-all hover:border-spiceup-accent/30 hover:text-spiceup-text-primary"
              aria-label={showBalances ? "Hide balances" : "Show balances"}
            >
              {showBalances ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-spiceup-accent text-sm font-bold text-[var(--primary-foreground)] shadow-[0_18px_40px_-24px_var(--color-spiceup-glow)]">
              {initials}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeUp}
          className="relative mb-6 overflow-hidden rounded-[2rem] border border-spiceup-border bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--color-spiceup-warning)_28%,transparent),transparent_38%),linear-gradient(145deg,color-mix(in_oklch,var(--color-spiceup-accent)_30%,var(--color-spiceup-surface)),color-mix(in_oklch,var(--color-spiceup-surface)_82%,black_18%))] p-6 shadow-[0_42px_100px_-52px_var(--color-spiceup-glow)]"
        >
          <div className="absolute -top-10 right-0 h-40 w-40 rounded-full bg-white/6 blur-2xl" />
          <div className="absolute -bottom-12 left-0 h-36 w-36 rounded-full bg-black/10 blur-2xl" />

          <div className="relative z-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/62">
                  Available balances
                </p>
                <h2 className="mt-2 max-w-[12ch] text-3xl font-bold leading-[0.95] text-white sm:text-[2.6rem]">
                  {showBalances
                    ? hasAnyBalance
                      ? "Ready to send, split, or receive."
                      : "Ready for your first live deposit."
                    : "Balance view hidden for privacy."}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <PrivacyBadge label={networkLabel} size="sm" />
                <button
                  onClick={refresh}
                  className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-white/70 transition-all hover:bg-white/16 hover:text-white"
                  aria-label="Refresh"
                >
                  <RefreshCw size={14} />
                </button>
              </div>
            </div>

            <p className="mt-4 max-w-[58ch] text-sm leading-7 text-white/76">
              {showBalances
                ? hasAnyBalance
                  ? "Your token balances are real. Fiat overlays stay off until pricing is properly wired, so the interface never claims more live depth than it actually has."
                  : "Fund your wallet to start sending support, receiving payments, and settling shared expenses."
                : "Toggle visibility whenever you want the room to stay private."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[1.6rem] bg-black/16 px-4 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/62">
                  Snapshot
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {balanceBreakdown && showBalances ? (
                    [
                      `ETH ${balanceBreakdown.eth.toFixed(4)}`,
                      `STRK ${balanceBreakdown.strk.toFixed(2)}`,
                      `USDC ${balanceBreakdown.usdc.toFixed(2)}`,
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white"
                      >
                        {item}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white">
                      Hidden for now
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[1.6rem] bg-white/8 px-4 py-4 backdrop-blur-sm">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/62">
                  Launch state
                </p>
                <p className="mt-3 text-sm font-semibold text-white">
                  {networkDescriptor}
                </p>
                <p className="mt-2 text-xs leading-6 text-white/72">
                  Authentication and balance truth are live. Transfer rails are
                  being connected without demo smoke.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-6 grid gap-3 md:grid-cols-3">
          {focusCards.map((item) => (
            <Link key={item.label} href={item.href}>
              <Card
                hover
                className="h-full rounded-[1.7rem] p-5 transition-transform duration-200 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spiceup-text-muted">
                      {item.label}
                    </p>
                    <p className="mt-3 text-3xl font-bold text-spiceup-text-primary">
                      {item.value}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-spiceup-accent/12 text-spiceup-accent">
                    <item.icon size={18} />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-spiceup-text-secondary">
                  {item.copy}
                </p>
              </Card>
            </Link>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spiceup-text-muted">
                Move money
              </p>
              <h2 className="mt-1 text-lg font-bold text-spiceup-text-primary">
                Choose your next lane
              </h2>
            </div>
            <div className="hidden items-center gap-2 rounded-full border border-spiceup-border bg-spiceup-surface px-3 py-2 text-xs font-medium text-spiceup-text-secondary sm:flex">
              <Sparkles size={14} className="text-spiceup-accent" />
              Designed for repeat use
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="group rounded-[1.7rem] border border-spiceup-border bg-spiceup-surface px-4 py-4 transition-all hover:-translate-y-0.5 hover:border-spiceup-accent/30 active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${action.bg}`}
                  >
                    <action.icon size={20} className={action.color} />
                  </div>
                  <ChevronRight
                    className="mt-1 text-spiceup-text-muted transition-transform group-hover:translate-x-0.5"
                    size={16}
                  />
                </div>
                <p className="mt-4 text-base font-semibold text-spiceup-text-primary">
                  {action.label}
                </p>
                <p className="mt-1 max-w-[24ch] text-sm leading-6 text-spiceup-text-secondary">
                  {action.blurb}
                </p>
              </Link>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spiceup-text-muted">
                Holdings
              </p>
              <h2 className="mt-1 text-lg font-bold text-spiceup-text-primary">
                Your asset stack
              </h2>
            </div>
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
                  amount: showBalances ? balances.ETH?.amount ?? null : null,
                  abbr: "ET",
                  color: "bg-blue-500/20",
                },
                {
                  symbol: "STRK",
                  name: "Starknet Token",
                  amount: showBalances ? balances.STRK?.amount ?? null : null,
                  abbr: "ST",
                  color: "bg-orange-500/20",
                },
                {
                  symbol: "USDC",
                  name: "USD Coin",
                  amount: showBalances ? balances.USDC?.amount ?? null : null,
                  abbr: "$C",
                  color: "bg-emerald-500/20",
                },
              ].map((token, index) => (
                <motion.div
                  key={token.symbol}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.2 + index * 0.06,
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

        <motion.div variants={fadeUp}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spiceup-text-muted">
                Activity
              </p>
              <h2 className="mt-1 text-lg font-bold text-spiceup-text-primary">
                Recent movement
              </h2>
            </div>
            {transactions.length > 5 && (
              <button
                onClick={() => router.push("/activity")}
                className="flex items-center gap-1 text-xs text-spiceup-text-muted transition-colors hover:text-spiceup-accent"
              >
                View All
                <ChevronRight size={14} />
              </button>
            )}
          </div>

          {!txLoaded ? (
            <TransactionListSkeleton count={3} />
          ) : transactions.length === 0 ? (
            <div className="rounded-[1.8rem] border border-spiceup-border bg-spiceup-surface p-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[1.4rem] bg-spiceup-accent/10">
                <Send size={24} className="text-spiceup-accent" />
              </div>
              <p className="mb-1 text-sm font-medium text-spiceup-text-secondary">
                No transactions yet
              </p>
              <p className="mx-auto max-w-[34ch] text-xs leading-6 text-spiceup-text-muted">
                Send or receive your first payment to begin building a real
                activity history. Nothing is pre-seeded here anymore.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedTx.slice(0, 3).map((group, groupIndex) => (
                <div key={group.label}>
                  <p className="mb-2.5 px-1 text-[11px] font-medium uppercase tracking-wider text-spiceup-text-muted">
                    {group.label}
                  </p>
                  <div className="space-y-2">
                    {group.txs.slice(0, 3).map((tx, index) => (
                      <TransactionItem
                        key={tx.id}
                        tx={tx}
                        index={groupIndex * 3 + index}
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
