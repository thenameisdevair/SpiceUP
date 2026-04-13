"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  ArrowDownToLine,
  AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useToastStore } from "@/stores/toast";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/AmountInput";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { formatBalance, shortenAddress } from "@/lib/format";

type WithdrawStage = "input" | "reviewing" | "withdrawing" | "done";

export default function WithdrawPage() {
  const router = useRouter();
  const recordTx = useTransactionHistory().recordTx;
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const confidential = useWalletStore((s) => s.confidential);
  const addToast = useToastStore((s) => s.addToast);

  const [stage, setStage] = useState<WithdrawStage>("input");
  const [token, setToken] = useState("STRK");
  const [amount, setAmount] = useState("");
  const [showRagequitConfirm, setShowRagequitConfirm] = useState(false);

  const confBalance = confidential?.balance ?? "0.0000";

  const amountError = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return "";
    if (parseFloat(amount) > parseFloat(confBalance)) {
      return `Insufficient confidential ${token} balance`;
    }
    return "";
  }, [amount, confBalance, token]);

  const canProceed = amount && parseFloat(amount) > 0 && !amountError;

  const handleReview = useCallback(() => {
    if (!canProceed) return;
    setStage("reviewing");
  }, [canProceed]);

  const handleWithdraw = useCallback(() => {
    setStage("withdrawing");

    // Simulate withdraw delay
    setTimeout(() => {
      recordTx({
        type: "withdraw",
        amount,
        token,
        counterparty: "self",
        txHash: `0xwithdraw_${Date.now().toString(16)}`,
        isPrivate: false,
      });
      addToast({ type: "success", title: "Withdrawal complete", message: `${amount} ${token} moved to public wallet` });
      setStage("done");
    }, 2000);
  }, [amount, token, recordTx, addToast]);

  const handleRagequit = useCallback(() => {
    if (!showRagequitConfirm) {
      setShowRagequitConfirm(true);
      return;
    }

    setShowRagequitConfirm(false);
    setStage("withdrawing");

    // Simulate emergency withdraw (longer)
    setTimeout(() => {
      recordTx({
        type: "withdraw",
        amount: confBalance,
        token,
        counterparty: "self (ragequit)",
        txHash: `0xragequit_${Date.now().toString(16)}`,
        isPrivate: false,
      });
      addToast({ type: "warning", title: "Emergency withdrawal complete", message: `${confBalance} ${token} moved to public wallet` });
      setStage("done");
    }, 3000);
  }, [showRagequitConfirm, confBalance, token, recordTx, addToast]);

  const handleBack = useCallback(() => {
    if (stage === "reviewing") {
      setStage("input");
      setShowRagequitConfirm(false);
    } else if (stage === "done") {
      router.push("/home");
    } else {
      router.back();
    }
  }, [stage, router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen"
    >
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
          {stage === "done"
            ? "Withdrawn!"
            : "Withdraw from Confidential"}
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {/* ===== INPUT STAGE ===== */}
        {stage === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Current confidential balance */}
            <div className="bg-gradient-to-br from-spiceup-accent/10 to-spiceup-accent/5 border border-spiceup-accent/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={16} className="text-spiceup-accent" />
                <span className="text-white font-semibold text-sm">
                  Confidential Balance
                </span>
                <PrivacyBadge label="ZK" size="sm" />
              </div>
              <p className="text-white text-2xl font-bold">
                {confBalance}{" "}
                <span className="text-sm font-medium text-spiceup-text-secondary">
                  STRK
                </span>
              </p>
            </div>

            {/* Token + Amount */}
            <AmountInput
              token={token}
              onTokenChange={setToken}
              amount={amount}
              onAmountChange={setAmount}
              maxBalance={confBalance}
              error={amountError}
            />

            {/* Destination info */}
            <div className="bg-spiceup-surface/50 border border-spiceup-border/50 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-spiceup-text-muted text-xs">
                  Destination
                </span>
                <span className="text-white text-xs font-medium">
                  Your public wallet
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-spiceup-text-muted text-xs">
                  Address
                </span>
                <span className="text-white text-xs font-mono">
                  {starknetAddress
                    ? shortenAddress(starknetAddress, 6)
                    : "—"}
                </span>
              </div>
            </div>

            {/* Info banner */}
            <div className="bg-spiceup-accent/10 border border-spiceup-accent/20 rounded-xl p-3.5 flex items-start gap-2.5">
              <ArrowDownToLine size={14} className="text-spiceup-accent mt-0.5 shrink-0" />
              <p className="text-spiceup-accent text-xs leading-relaxed">
                Tokens will be moved from your confidential Tongo balance back
                to your public Starknet wallet.
              </p>
            </div>

            {/* Continue */}
            <Button
              variant="primary"
              size="lg"
              className="w-full gap-2"
              disabled={!canProceed}
              onClick={handleReview}
            >
              <ArrowDownToLine size={16} />
              Review Withdrawal
            </Button>

            {/* Ragequit Section */}
            {parseFloat(confBalance) > 0 && (
              <div className="pt-4">
                <div className="h-px bg-spiceup-border mb-4" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-red-400 text-xs font-semibold">
                      Emergency Withdraw
                    </span>
                  </div>
                  <p className="text-spiceup-text-muted text-xs leading-relaxed">
                    Use ragequit to emergency-withdraw your entire confidential
                    balance. This action cannot be undone.
                  </p>

                  {showRagequitConfirm ? (
                    <div className="space-y-2">
                      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                        <p className="text-red-400 text-xs font-medium mb-1">
                          Are you sure?
                        </p>
                        <p className="text-red-400/70 text-[11px]">
                          This will withdraw all {formatBalance(confBalance)} STRK
                          from your confidential balance to your public wallet.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        size="lg"
                        className="w-full gap-2"
                        onClick={handleRagequit}
                      >
                        <AlertTriangle size={16} />
                        Yes, Withdraw All
                      </Button>
                      <Button
                        variant="ghost"
                        size="md"
                        className="w-full"
                        onClick={() => setShowRagequitConfirm(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="destructive"
                      size="lg"
                      className="w-full gap-2"
                      onClick={handleRagequit}
                    >
                      <AlertTriangle size={16} />
                      Emergency Withdraw All
                    </Button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ===== REVIEWING STAGE ===== */}
        {stage === "reviewing" && (
          <motion.div
            key="reviewing"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Summary */}
            <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-6 space-y-4">
              <div className="text-center">
                <p className="text-spiceup-text-secondary text-sm mb-1">
                  You&apos;re withdrawing
                </p>
                <p className="text-white text-3xl font-bold">
                  {parseFloat(amount).toFixed(4)} {token}
                </p>
              </div>

              <div className="h-px bg-spiceup-border" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">
                    Direction
                  </span>
                  <span className="text-white text-sm">
                    Confidential → Public
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Token</span>
                  <span className="text-white text-sm">{token}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">
                    Destination
                  </span>
                  <span className="text-white text-sm font-mono">
                    {starknetAddress
                      ? shortenAddress(starknetAddress, 6)
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="bg-spiceup-accent/10 border border-spiceup-accent/20 rounded-xl p-3">
                <p className="text-spiceup-accent text-xs leading-relaxed">
                  🔒 Tokens will be visible on your public wallet after
                  withdrawal.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2"
                onClick={handleWithdraw}
              >
                <ArrowDownToLine size={16} />
                Confirm Withdrawal
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

        {/* ===== WITHDRAWING STAGE ===== */}
        {stage === "withdrawing" && (
          <motion.div
            key="withdrawing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-spiceup-accent/10 flex items-center justify-center">
              <Loader2
                size={36}
                className="text-spiceup-accent animate-spin"
              />
            </div>
            <div className="text-center">
              <p className="text-white text-lg font-semibold mb-1">
                Withdrawing...
              </p>
              <p className="text-spiceup-text-muted text-sm">
                Moving tokens to your public wallet
              </p>
            </div>
          </motion.div>
        )}

        {/* ===== DONE STAGE ===== */}
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
                Withdrawal Complete!
              </p>
              <p className="text-spiceup-text-secondary text-sm">
                Tokens are now available in your public wallet
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2"
                onClick={() => router.push("/home")}
              >
                Back to Home
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
                Withdraw More
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
