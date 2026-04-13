"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRightLeft,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useEarnStore } from "@/stores/earn";
import { createDcaOrder, DCA_FREQUENCY_OPTIONS } from "@/lib/dca";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatBalance } from "@/lib/format";
import { TOKEN_BY_SYMBOL } from "@/constants/tokens";
import type { DcaFrequency } from "@/lib/earn";

type DcaCreateStage = "input" | "review" | "creating" | "done";

const TOKEN_OPTIONS = ["STRK", "ETH", "USDC"] as const;

export default function DcaCreatePage() {
  const router = useRouter();
  const recordTx = useTransactionHistory().recordTx;

  const [stage, setStage] = useState<DcaCreateStage>("input");
  const [sellToken, setSellToken] = useState("STRK");
  const [buyToken, setBuyToken] = useState("ETH");
  const [totalBudget, setTotalBudget] = useState("");
  const [frequency, setFrequency] = useState<DcaFrequency>("Weekly");
  const [error, setError] = useState("");

  const perCycleAmount = useMemo(() => {
    if (!totalBudget || parseFloat(totalBudget) <= 0) return "0";
    const cyclesPerDay: Record<DcaFrequency, number> = {
      "Every 12h": 2,
      Daily: 1,
      Weekly: 1 / 7,
    };
    const totalDays = 30; // assume 30 day period
    const cycles = cyclesPerDay[frequency] * totalDays;
    return (parseFloat(totalBudget) / cycles).toFixed(4);
  }, [totalBudget, frequency]);

  const amountError = useMemo(() => {
    if (!totalBudget || parseFloat(totalBudget) <= 0) return "";
    if (sellToken === buyToken) return "Sell and buy tokens must differ";
    return "";
  }, [totalBudget, sellToken, buyToken]);

  const canProceed =
    totalBudget &&
    parseFloat(totalBudget) > 0 &&
    !amountError &&
    sellToken !== buyToken;

  const handleReview = useCallback(() => {
    if (!canProceed) return;
    setError("");
    setStage("review");
  }, [canProceed]);

  const handleCreate = useCallback(() => {
    setStage("creating");
    setTimeout(async () => {
      try {
        await createDcaOrder({
          sellToken,
          buyToken,
          sellAmount: totalBudget,
          frequency,
        });
        recordTx({
          type: "dca_create",
          amount: totalBudget,
          token: sellToken,
          counterparty: `${sellToken}→${buyToken} DCA`,
          txHash: `0x${Date.now().toString(16)}...`,
          isPrivate: false,
        });
        // Refresh DCA store
        const { setDcaOrders, setDcaLoading } = useEarnStore.getState();
        setDcaLoading(true);
        const { getActiveDcaOrders } = await import("@/lib/dca");
        const orders = await getActiveDcaOrders();
        setDcaOrders(orders);
        setDcaLoading(false);
        setStage("done");
      } catch {
        setError("Failed to create DCA order. Please try again.");
        setStage("input");
      }
    }, 2000);
  }, [sellToken, buyToken, totalBudget, frequency, recordTx]);

  const handleBack = useCallback(() => {
    if (stage === "review") {
      setStage("input");
    } else if (stage === "done") {
      setStage("input");
      setTotalBudget("");
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
          {stage === "done" ? "DCA Created!" : "New DCA Order"}
        </h1>
      </div>

      <AnimatePresence mode="wait">
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
            {/* Token Pair */}
            <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-5 space-y-4">
              <p className="text-white text-sm font-semibold">Token Pair</p>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-spiceup-text-muted text-xs mb-2">
                    Sell Token
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TOKEN_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSellToken(t)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                          sellToken === t
                            ? "bg-spiceup-warning/15 border-spiceup-warning/30 text-spiceup-warning"
                            : "bg-white/5 border-spiceup-border text-spiceup-text-muted"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-spiceup-text-muted pt-4">
                  <ArrowRightLeft size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-spiceup-text-muted text-xs mb-2">
                    Buy Token
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {TOKEN_OPTIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setBuyToken(t)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                          buyToken === t
                            ? "bg-spiceup-success/15 border-spiceup-success/30 text-spiceup-success"
                            : "bg-white/5 border-spiceup-border text-spiceup-text-muted"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Total Budget */}
            <Input
              label="Total Budget Amount"
              placeholder="0.0"
              value={totalBudget}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                const parts = val.split(".");
                if (parts.length > 2) return;
                if (parts.length === 2 && parts[1].length > 6) return;
                setTotalBudget(val);
              }}
              error={amountError}
            />

            {/* Per-cycle calculation */}
            {totalBudget && parseFloat(totalBudget) > 0 && (
              <div className="bg-spiceup-surface/50 border border-spiceup-border/50 rounded-xl p-3 flex items-center justify-between">
                <span className="text-spiceup-text-muted text-xs">
                  Per-cycle amount (30d)
                </span>
                <span className="text-white text-xs font-medium">
                  {formatBalance(perCycleAmount)} {sellToken}
                </span>
              </div>
            )}

            {/* Frequency */}
            <div>
              <p className="text-white text-sm font-semibold mb-2">
                Frequency
              </p>
              <div className="flex gap-2">
                {DCA_FREQUENCY_OPTIONS.map((f) => (
                  <button
                    key={f}
                    onClick={() => setFrequency(f)}
                    className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      frequency === f
                        ? "bg-spiceup-accent/15 border-spiceup-accent/30 text-spiceup-accent"
                        : "bg-white/5 border-spiceup-border text-spiceup-text-muted"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

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
              <ArrowRightLeft size={16} />
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
                  New DCA Order
                </p>
                <p className="text-white text-2xl font-bold">
                  {sellToken} → {buyToken}
                </p>
              </div>

              <div className="h-px bg-spiceup-border" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">
                    Total budget
                  </span>
                  <span className="text-white text-sm font-medium">
                    {formatBalance(totalBudget)} {sellToken}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">
                    Per-cycle amount
                  </span>
                  <span className="text-white text-sm font-medium">
                    {formatBalance(perCycleAmount)} {sellToken}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">
                    Frequency
                  </span>
                  <span className="text-white text-sm">{frequency}</span>
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
                onClick={handleCreate}
              >
                <ArrowRightLeft size={16} />
                Create DCA Order
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

        {/* CREATING STAGE */}
        {stage === "creating" && (
          <motion.div
            key="creating"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-spiceup-warning/10 flex items-center justify-center">
              <Loader2
                size={36}
                className="text-spiceup-warning animate-spin"
              />
            </div>
            <div className="text-center">
              <p className="text-white text-lg font-semibold mb-1">
                Creating DCA order...
              </p>
              <p className="text-spiceup-text-muted text-sm">
                {sellToken} → {buyToken}
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
              <p className="text-white text-xl font-bold mb-1">
                DCA Order Created!
              </p>
              <p className="text-spiceup-text-secondary text-sm">
                {sellToken} → {buyToken} · {frequency}
              </p>
              <p className="text-spiceup-text-muted text-xs mt-1">
                {formatBalance(totalBudget)} {sellToken} total budget
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
                  setTotalBudget("");
                }}
              >
                Create Another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
