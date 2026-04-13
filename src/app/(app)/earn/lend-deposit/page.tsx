"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
  Landmark,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useWalletStore } from "@/stores/wallet";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useEarnStore } from "@/stores/earn";
import { depositToLending } from "@/lib/lending";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatBalance } from "@/lib/format";

type DepositStage = "input" | "review" | "depositing" | "done";

function LendDepositPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recordTx = useTransactionHistory().recordTx;

  const poolId = searchParams.get("pool") ?? "";
  const poolName = searchParams.get("name") ?? "Lending Pool";
  const token = searchParams.get("token") ?? "USDC";
  const apy = parseFloat(searchParams.get("apy") ?? "0");

  const tokenBalance =
    useWalletStore((s) => s.balances[token as string]?.amount ?? "0");

  const [stage, setStage] = useState<DepositStage>("input");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const amountError = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return "";
    if (parseFloat(amount) > parseFloat(tokenBalance)) {
      return `Insufficient ${token} balance`;
    }
    return "";
  }, [amount, tokenBalance, token]);

  const canProceed = amount && parseFloat(amount) > 0 && !amountError;

  const handleReview = useCallback(() => {
    if (!canProceed) return;
    setError("");
    setStage("review");
  }, [canProceed]);

  const handleDeposit = useCallback(() => {
    setStage("depositing");
    setTimeout(async () => {
      try {
        await depositToLending(poolId, poolName, token, amount, apy);
        recordTx({
          type: "lend_deposit",
          amount,
          token,
          counterparty: poolName,
          txHash: `0x${Date.now().toString(16)}...`,
          isPrivate: false,
        });
        // Refresh earn store
        const { setLendingPositions, setLendingLoading } = useEarnStore.getState();
        setLendingLoading(true);
        const { getLendingPositions } = await import("@/lib/lending");
        const positions = await getLendingPositions();
        setLendingPositions(positions);
        setLendingLoading(false);
        setStage("done");
      } catch {
        setError("Deposit failed. Please try again.");
        setStage("input");
      }
    }, 2000);
  }, [amount, poolId, poolName, token, apy, recordTx]);

  const handleBack = useCallback(() => {
    if (stage === "review") {
      setStage("input");
    } else if (stage === "done") {
      setStage("input");
      setAmount("");
    } else {
      router.push("/earn");
    }
  }, [stage, router]);

  const yearlyEarnings = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return "0";
    return (parseFloat(amount) * (apy / 100)).toFixed(2);
  }, [amount, apy]);

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
          {stage === "done" ? "Deposited!" : "Deposit"}
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {/* Pool Info */}
        {(stage === "input" || stage === "review") && (
          <motion.div
            key="pool-info"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-5 mb-6"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-spiceup-success/15 border border-spiceup-success/25 flex items-center justify-center">
                <Landmark size={18} className="text-spiceup-success" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm">{poolName}</p>
                <Badge variant="success" size="sm" className="mt-1">
                  {apy}% APY
                </Badge>
              </div>
            </div>
          </motion.div>
        )}

        {/* INPUT STAGE */}
        {stage === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* APY Banner */}
            <div className="bg-spiceup-success/10 border border-spiceup-success/20 rounded-xl p-3">
              <p className="text-spiceup-success text-xs">
                💰 Earn {apy}% APY on your {token} deposit. Earnings accrue in
                real-time.
              </p>
            </div>

            <Input
              label="Deposit Amount"
              placeholder="0.0"
              value={amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                const parts = val.split(".");
                if (parts.length > 2) return;
                if (parts.length === 2 && parts[1].length > 6) return;
                setAmount(val);
              }}
              error={amountError}
            />

            {amount && parseFloat(amount) > 0 && (
              <div className="bg-spiceup-surface/50 border border-spiceup-border/50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-xs">
                    Available {token}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-xs font-medium">
                      {formatBalance(tokenBalance)} {token}
                    </span>
                    <button
                      onClick={() => setAmount(tokenBalance)}
                      className="text-spiceup-accent text-xs font-semibold"
                    >
                      MAX
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-xs">
                    Est. yearly earnings
                  </span>
                  <span className="text-spiceup-success text-xs font-medium">
                    +{yearlyEarnings} {token}
                  </span>
                </div>
              </div>
            )}

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            <Button
              variant="primary"
              size="lg"
              className="w-full gap-2"
              disabled={!canProceed}
              onClick={handleReview}
            >
              <ArrowDownToLine size={16} />
              Review
            </Button>
          </motion.div>
        )}

        {/* REVIEW STAGE */}
        {stage === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-6 space-y-4">
              <div className="text-center">
                <p className="text-spiceup-text-secondary text-sm mb-1">
                  You&apos;re depositing
                </p>
                <p className="text-white text-3xl font-bold">
                  {parseFloat(amount).toFixed(4)} {token}
                </p>
              </div>

              <div className="h-px bg-spiceup-border" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Pool</span>
                  <span className="text-white text-sm">{poolName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">APY</span>
                  <span className="text-spiceup-success text-sm">
                    {apy}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">
                    Est. yearly
                  </span>
                  <span className="text-spiceup-success text-sm">
                    +{yearlyEarnings} {token}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">
                    Network
                  </span>
                  <span className="text-white text-sm">Starknet Sepolia</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2"
                onClick={handleDeposit}
              >
                <ArrowDownToLine size={16} />
                Confirm & Deposit
              </Button>
              <Button
                variant="ghost"
                size="md"
                className="w-full"
                onClick={() => setStage("input")}
              >
                Go Back
              </Button>
            </div>
          </motion.div>
        )}

        {/* DEPOSITING STAGE */}
        {stage === "depositing" && (
          <motion.div
            key="depositing"
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
                Depositing...
              </p>
              <p className="text-spiceup-text-muted text-sm">
                {parseFloat(amount).toFixed(4)} {token}
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
              <p className="text-white text-xl font-bold mb-1">Deposited!</p>
              <p className="text-spiceup-text-secondary text-sm">
                {parseFloat(amount).toFixed(4)} {token} deposited into{" "}
                {poolName}
              </p>
              <p className="text-spiceup-text-muted text-xs mt-1">
                Earning {apy}% APY
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2"
                onClick={() => router.push("/earn")}
              >
                Back to Earn
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => {
                  setStage("input");
                  setAmount("");
                }}
              >
                Deposit More
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function LendDepositPage() {
  return (
    <Suspense
      fallback={
        <div className="px-5 pt-5 pb-8 min-h-screen flex items-center justify-center">
          <Loader2 className="text-spiceup-accent animate-spin" size={32} />
        </div>
      }
    >
      <LendDepositPageInner />
    </Suspense>
  );
}
