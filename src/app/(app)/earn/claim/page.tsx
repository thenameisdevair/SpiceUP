"use client";

import { useState, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Gift,
  CheckCircle2,
  Loader2,
  Shield,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useEarnStore } from "@/stores/earn";
import { claimPoolRewards, getStakedPositions } from "@/lib/staking";
import { Button } from "@/components/ui/Button";
import { formatBalance } from "@/lib/format";

type ClaimStage = "confirm" | "claiming" | "done";

function ClaimPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordTx = useTransactionHistory().recordTx;

  const poolContract = searchParams.get("pool") ?? "";
  const validatorName = searchParams.get("name") ?? "Unknown Pool";
  const rewardsStr = searchParams.get("rewards") ?? "0";
  const rewards = parseFloat(rewardsStr);

  const [stage, setStage] = useState<ClaimStage>("confirm");
  const [error, setError] = useState("");

  const handleClaim = useCallback(() => {
    setStage("claiming");
    setTimeout(async () => {
      try {
        const result = await claimPoolRewards(poolContract);
        recordTx({
          type: "claim_rewards",
          amount: result.claimed,
          token: "STRK",
          counterparty: validatorName,
          txHash: `0x${Date.now().toString(16)}...`,
          isPrivate: false,
        });
        // Refresh earn store
        const { setStakedPositions, setStakingLoading } = useEarnStore.getState();
        setStakingLoading(true);
        const positions = await getStakedPositions();
        setStakedPositions(positions);
        setStakingLoading(false);
        setStage("done");
      } catch {
        setError("Claim failed. Please try again.");
        setStage("confirm");
      }
    }, 1500);
  }, [poolContract, validatorName, recordTx]);

  const handleBack = useCallback(() => {
    if (stage === "confirm") {
      router.push("/earn");
    } else if (stage === "done") {
      router.push("/earn");
    } else {
      router.push("/earn");
    }
  }, [stage, router]);

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={handleBack}
          className="text-spiceup-text-muted hover:text-white transition-colors p-1 -m-1"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-lg font-bold">
          {stage === "done" ? "Claimed!" : "Claim Rewards"}
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {/* Pool Info */}
        {(stage === "confirm" || stage === "claiming") && (
          <motion.div
            key="pool-info"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-spiceup-accent/15 border border-spiceup-accent/25 flex items-center justify-center">
                <Shield size={18} className="text-spiceup-accent" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">
                  {validatorName}
                </p>
                <p className="text-spiceup-text-muted text-xs">Validator Pool</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* CONFIRM STAGE */}
        {stage === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-6 space-y-4">
              <div className="text-center">
                <p className="text-spiceup-text-secondary text-sm mb-1">
                  Claimable rewards
                </p>
                <p className="text-spiceup-success text-3xl font-bold">
                  {formatBalance(rewardsStr)} STRK
                </p>
              </div>

              <div className="h-px bg-spiceup-border" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">From</span>
                  <span className="text-white text-sm">{validatorName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">
                    Network
                  </span>
                  <span className="text-white text-sm">Starknet Sepolia</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full gap-2"
              onClick={handleClaim}
              disabled={rewards <= 0}
            >
              <Gift size={16} />
              Claim Rewards
            </Button>
          </motion.div>
        )}

        {/* CLAIMING STAGE */}
        {stage === "claiming" && (
          <motion.div
            key="claiming"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-spiceup-success/10 flex items-center justify-center">
              <Loader2
                size={36}
                className="text-spiceup-success animate-spin"
              />
            </div>
            <div className="text-center">
              <p className="text-white text-lg font-semibold mb-1">
                Claiming...
              </p>
              <p className="text-spiceup-text-muted text-sm">
                {formatBalance(rewardsStr)} STRK
              </p>
            </div>
          </motion.div>
        )}

        {/* DONE STAGE */}
        {stage === "done" && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.1,
              }}
              className="w-20 h-20 rounded-full bg-spiceup-success/10 flex items-center justify-center"
            >
              <CheckCircle2 size={40} className="text-spiceup-success" />
            </motion.div>
            <div className="text-center">
              <p className="text-white text-xl font-bold mb-1">Rewards Claimed!</p>
              <p className="text-spiceup-text-secondary text-sm">
                {formatBalance(rewardsStr)} STRK from {validatorName}
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              className="w-full max-w-xs gap-2"
              onClick={() => router.push("/earn")}
            >
              Back to Earn
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <div className="px-5 pt-5 pb-8 min-h-screen flex items-center justify-center">
          <Loader2 className="text-spiceup-accent animate-spin" size={32} />
        </div>
      }
    >
      <ClaimPageInner />
    </Suspense>
  );
}
