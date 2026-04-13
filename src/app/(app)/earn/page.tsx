"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Shield,
  ArrowRightLeft,
  Landmark,
  Plus,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useStaking } from "@/hooks/useStaking";
import { useDCA } from "@/hooks/useDCA";
import { useLending } from "@/hooks/useLending";
import { PoolCard } from "@/components/PoolCard";
import { DcaOrderCard } from "@/components/DcaOrderCard";
import { LendingMarketCard } from "@/components/LendingMarketCard";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatBalance } from "@/lib/format";
import { cancelDcaOrder } from "@/lib/dca";
import type { StakerPool, StakedPosition, AppDcaOrder, AppLendingMarket, AppLendingPosition } from "@/lib/earn";

type EarnTab = "staking" | "dca" | "lending";

const TAB_CONFIG: { key: EarnTab; label: string; icon: typeof Shield }[] = [
  { key: "staking", label: "Staking", icon: Shield },
  { key: "dca", label: "DCA", icon: ArrowRightLeft },
  { key: "lending", label: "Lending", icon: Landmark },
];

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

export default function EarnPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<EarnTab>("staking");

  // Data hooks
  const { pools, positions: stakedPositions, loading: stakingLoading } = useStaking();
  const { orders: dcaOrders, loading: dcaLoading, refresh: refreshDca } = useDCA();
  const { markets, positions: lendingPositions, loading: lendingLoading } = useLending();

  // Compute summary values
  const totalStaked = stakedPositions.reduce(
    (sum, p) => sum + parseFloat(p.staked),
    0
  );
  const totalRewards = stakedPositions.reduce(
    (sum, p) => sum + parseFloat(p.rewards),
    0
  );
  const totalLent = lendingPositions.reduce(
    (sum, p) => sum + parseFloat(p.depositedAmount),
    0
  );

  // Staking actions
  const handleStake = useCallback(
    (pool: StakerPool) => {
      router.push(`/earn/stake?pool=${encodeURIComponent(pool.poolContract)}&name=${encodeURIComponent(pool.validatorName)}&apy=${pool.apyPercent ?? ""}`);
    },
    [router]
  );

  const handleClaim = useCallback(
    (pool: StakerPool, position: StakedPosition) => {
      router.push(
        `/earn/claim?pool=${encodeURIComponent(pool.poolContract)}&name=${encodeURIComponent(pool.validatorName)}&rewards=${encodeURIComponent(position.rewards)}`
      );
    },
    [router]
  );

  const handleUnstake = useCallback(
    (pool: StakerPool, position: StakedPosition) => {
      router.push(
        `/earn/stake?pool=${encodeURIComponent(pool.poolContract)}&name=${encodeURIComponent(pool.validatorName)}&apy=${pool.apyPercent ?? ""}&unstake=true&staked=${encodeURIComponent(position.staked)}`
      );
    },
    [router]
  );

  // DCA actions
  const handleCancelDca = useCallback(
    async (order: AppDcaOrder) => {
      try {
        await cancelDcaOrder(order.id);
        refreshDca();
      } catch {
        // silently fail in mock
      }
    },
    [refreshDca]
  );

  // Lending actions
  const handleDeposit = useCallback(
    (market: AppLendingMarket) => {
      router.push(
        `/earn/lend-deposit?pool=${encodeURIComponent(market.poolId)}&name=${encodeURIComponent(market.poolName)}&token=${encodeURIComponent(market.token)}&apy=${market.apyPercent}`
      );
    },
    [router]
  );

  const handleWithdraw = useCallback(
    (market: AppLendingMarket, position: AppLendingPosition) => {
      router.push(
        `/earn/lend-withdraw?pool=${encodeURIComponent(market.poolId)}&name=${encodeURIComponent(market.poolName)}&token=${encodeURIComponent(position.token)}&apy=${position.apyPercent}&deposited=${encodeURIComponent(position.depositedAmount)}`
      );
    },
    [router]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-2xl mx-auto px-5 pt-5 pb-8"
    >
      <motion.div variants={stagger} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-spiceup-warning/15 border border-spiceup-warning/25 flex items-center justify-center">
            <TrendingUp size={20} className="text-spiceup-warning" />
          </div>
          <div>
            <h1 className="text-white text-lg font-bold tracking-tight">Earn</h1>
            <p className="text-spiceup-text-muted text-xs">Grow your assets</p>
          </div>
        </motion.div>

        {/* Summary Card */}
        <motion.div
          variants={fadeUp}
          className="bg-gradient-to-br from-spiceup-warning/20 via-spiceup-warning/10 to-spiceup-warning/5 border border-spiceup-warning/20 rounded-2xl p-5 mb-6 relative overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-spiceup-warning/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-spiceup-warning/5 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={14} className="text-spiceup-warning" />
              <p className="text-spiceup-text-secondary text-sm font-medium">Total Earning</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white text-lg font-bold">
                  {formatBalance(totalStaked.toString())}
                </p>
                <p className="text-spiceup-text-muted text-[10px] uppercase tracking-wider mt-0.5">Staked</p>
              </div>
              <div className="bg-spiceup-success/5 rounded-xl p-3">
                <p className="text-spiceup-success text-lg font-bold">
                  {formatBalance(totalRewards.toString())}
                </p>
                <p className="text-spiceup-text-muted text-[10px] uppercase tracking-wider mt-0.5">Claimable</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3">
                <p className="text-white text-lg font-bold">
                  {formatBalance(totalLent.toString())}
                </p>
                <p className="text-spiceup-text-muted text-[10px] uppercase tracking-wider mt-0.5">Lent</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sub-tabs */}
        <motion.div variants={fadeUp} className="bg-spiceup-surface border border-spiceup-border rounded-xl p-1 flex mb-6">
          {TAB_CONFIG.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  isActive
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-spiceup-text-muted hover:text-white"
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          {activeTab === "staking" && (
            <motion.div
              key="staking"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <StakingTab
                pools={pools}
                positions={stakedPositions}
                loading={stakingLoading}
                onStake={handleStake}
                onClaim={handleClaim}
                onUnstake={handleUnstake}
              />
            </motion.div>
          )}
          {activeTab === "dca" && (
            <motion.div
              key="dca"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <DcaTab
                orders={dcaOrders}
                loading={dcaLoading}
                onCancel={handleCancelDca}
                onNewOrder={() => router.push("/earn/dca-create")}
              />
            </motion.div>
          )}
          {activeTab === "lending" && (
            <motion.div
              key="lending"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <LendingTab
                markets={markets}
                positions={lendingPositions}
                loading={lendingLoading}
                onDeposit={handleDeposit}
                onWithdraw={handleWithdraw}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

/* ===== Sub-tab components ===== */

function StakingTab({
  pools,
  positions,
  loading,
  onStake,
  onClaim,
  onUnstake,
}: {
  pools: StakerPool[];
  positions: StakedPosition[];
  loading: boolean;
  onStake: (pool: StakerPool) => void;
  onClaim: (pool: StakerPool, position: StakedPosition) => void;
  onUnstake: (pool: StakerPool, position: StakedPosition) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-spiceup-surface border border-spiceup-border rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" width="40px" height="40px" />
              <div className="flex-1 space-y-2">
                <Skeleton width="60%" height="14px" />
                <Skeleton width="40%" height="12px" />
              </div>
              <Skeleton width="50px" height="22px" />
            </div>
            <Skeleton width="100%" height="36px" />
          </div>
        ))}
      </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-spiceup-accent/10 flex items-center justify-center mx-auto mb-4">
          <Shield size={24} className="text-spiceup-accent" />
        </div>
        <p className="text-spiceup-text-secondary text-sm font-medium mb-1">
          No validator pools available
        </p>
        <p className="text-spiceup-text-muted text-xs">
          Check back later for new staking opportunities
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pools.map((pool, i) => {
        const pos = positions.find((p) => p.poolContract === pool.poolContract);
        return (
          <PoolCard
            key={pool.poolContract}
            pool={pool}
            position={pos}
            index={i}
            onStake={onStake}
            onClaim={onClaim}
            onUnstake={onUnstake}
          />
        );
      })}
    </div>
  );
}

function DcaTab({
  orders,
  loading,
  onCancel,
  onNewOrder,
}: {
  orders: AppDcaOrder[];
  loading: boolean;
  onCancel: (order: AppDcaOrder) => void;
  onNewOrder: () => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-spiceup-surface border border-spiceup-border rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" width="40px" height="40px" />
              <div className="flex-1 space-y-2">
                <Skeleton width="50%" height="14px" />
                <Skeleton width="30%" height="12px" />
              </div>
            </div>
            <Skeleton width="100%" height="60px" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-spiceup-warning/10 flex items-center justify-center mx-auto mb-4">
            <ArrowRightLeft size={24} className="text-spiceup-warning" />
          </div>
          <p className="text-spiceup-text-secondary text-sm font-medium mb-1">
            No active DCA orders
          </p>
          <p className="text-spiceup-text-muted text-xs">
            Set up automatic buys at your preferred frequency
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full gap-2 shadow-lg shadow-spiceup-accent/20"
          onClick={onNewOrder}
        >
          <Plus size={16} />
          New DCA Order
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order, i) => (
        <DcaOrderCard
          key={order.id}
          order={order}
          index={i}
          onCancel={onCancel}
        />
      ))}
      <Button
        variant="secondary"
        size="md"
        className="w-full gap-2 mt-2"
        onClick={onNewOrder}
      >
        <Plus size={16} />
        New DCA Order
      </Button>
    </div>
  );
}

function LendingTab({
  markets,
  positions,
  loading,
  onDeposit,
  onWithdraw,
}: {
  markets: AppLendingMarket[];
  positions: AppLendingPosition[];
  loading: boolean;
  onDeposit: (market: AppLendingMarket) => void;
  onWithdraw: (market: AppLendingMarket, position: AppLendingPosition) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-spiceup-surface border border-spiceup-border rounded-xl p-5 space-y-3"
          >
            <div className="flex items-center gap-3">
              <Skeleton variant="circular" width="40px" height="40px" />
              <div className="flex-1 space-y-2">
                <Skeleton width="60%" height="14px" />
                <Skeleton width="40%" height="12px" />
              </div>
              <Skeleton width="50px" height="22px" />
            </div>
            <Skeleton width="100%" height="36px" />
          </div>
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-spiceup-success/10 flex items-center justify-center mx-auto mb-4">
          <Landmark size={24} className="text-spiceup-success" />
        </div>
        <p className="text-spiceup-text-secondary text-sm font-medium mb-1">
          No lending markets available
        </p>
        <p className="text-spiceup-text-muted text-xs">
          Check back later for lending opportunities
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {markets.map((market, i) => {
        const pos = positions.find((p) => p.poolId === market.poolId);
        return (
          <LendingMarketCard
            key={market.poolId}
            market={market}
            position={pos}
            index={i}
            onDeposit={onDeposit}
            onWithdraw={onWithdraw}
          />
        );
      })}
    </div>
  );
}
