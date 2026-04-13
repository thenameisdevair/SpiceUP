"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  ArrowRightLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useWalletStore } from "@/stores/wallet";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { useToastStore } from "@/stores/toast";
import { Button } from "@/components/ui/Button";
import { AmountInput } from "@/components/AmountInput";
import { PrivacyBadge } from "@/components/PrivacyBadge";

type FundStage = "input" | "reviewing" | "funding" | "done";

export default function FundPage() {
  const router = useRouter();
  const recordTx = useTransactionHistory().recordTx;
  const balances = useWalletStore((s) => s.balances);
  const addToast = useToastStore((s) => s.addToast);

  const [stage, setStage] = useState<FundStage>("input");
  const [token, setToken] = useState("STRK");
  const [amount, setAmount] = useState("");

  const maxBalance = useMemo(() => {
    const bal = balances[token];
    return bal?.amount ?? "0";
  }, [balances, token]);

  const amountError = useMemo(() => {
    if (!amount || parseFloat(amount) <= 0) return "";
    if (parseFloat(amount) > parseFloat(maxBalance)) {
      return `Insufficient ${token} balance`;
    }
    return "";
  }, [amount, maxBalance, token]);

  const canProceed = amount && parseFloat(amount) > 0 && !amountError;

  const handleReview = useCallback(() => {
    if (!canProceed) return;
    setStage("reviewing");
  }, [canProceed]);

  const handleFund = useCallback(() => {
    setStage("funding");

    // Simulate funding delay
    setTimeout(() => {
      recordTx({
        type: "fund",
        amount,
        token,
        counterparty: "self",
        txHash: `0xfund_${Date.now().toString(16)}`,
        isPrivate: false,
      });
      addToast({ type: "success", title: "Funding complete", message: `${amount} ${token} added to confidential balance` });
      setStage("done");
    }, 2000);
  }, [amount, token, recordTx, addToast]);

  const handleBack = useCallback(() => {
    if (stage === "reviewing") {
      setStage("input");
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
          {stage === "done" ? "Funded!" : "Fund Confidential Balance"}
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
            {/* Info banner */}
            <div className="bg-spiceup-accent/10 border border-spiceup-accent/20 rounded-xl p-3.5 flex items-start gap-2.5">
              <ArrowRightLeft size={14} className="text-spiceup-accent mt-0.5 shrink-0" />
              <p className="text-spiceup-accent text-xs leading-relaxed">
                Move tokens from your public wallet to your private confidential
                balance. Tokens will be hidden on-chain via Tongo.
              </p>
            </div>

            {/* Token + Amount */}
            <AmountInput
              token={token}
              onTokenChange={setToken}
              amount={amount}
              onAmountChange={setAmount}
              maxBalance={maxBalance}
              error={amountError}
            />

            {/* Available balance */}
            <div className="bg-spiceup-surface/50 border border-spiceup-border/50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-spiceup-text-muted text-xs">
                Public {token} balance
              </span>
              <span className="text-white text-xs font-medium">
                {maxBalance} {token}
              </span>
            </div>

            {/* Privacy note */}
            <div className="bg-spiceup-surface border border-spiceup-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} className="text-spiceup-accent" />
                <span className="text-white text-xs font-semibold">
                  How funding works
                </span>
              </div>
              <ul className="text-spiceup-text-muted text-xs leading-relaxed space-y-1.5">
                <li className="flex items-start gap-1.5">
                  <span className="text-spiceup-accent mt-0.5">•</span>
                  Tokens are moved from your public Starknet address
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-spiceup-accent mt-0.5">•</span>
                  They become part of your confidential Tongo balance
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-spiceup-accent mt-0.5">•</span>
                  Only you can see the balance and transact from it
                </li>
              </ul>
            </div>

            {/* Continue */}
            <Button
              variant="primary"
              size="lg"
              className="w-full gap-2"
              disabled={!canProceed}
              onClick={handleReview}
            >
              <ArrowRightLeft size={16} />
              Review Funding
            </Button>
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
                  You&apos;re funding
                </p>
                <p className="text-white text-3xl font-bold">
                  {parseFloat(amount).toFixed(4)} {token}
                </p>
              </div>

              <div className="h-px bg-spiceup-border" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Direction</span>
                  <span className="text-white text-sm">Public → Confidential</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Token</span>
                  <span className="text-white text-sm">{token}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Privacy</span>
                  <PrivacyBadge label="ZK" size="sm" />
                </div>
              </div>

              <div className="bg-spiceup-accent/10 border border-spiceup-accent/20 rounded-xl p-3">
                <p className="text-spiceup-accent text-xs leading-relaxed">
                  🔒 Your tokens will be locked in the Tongo confidential
                  contract. No one else can see your balance.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2"
                onClick={handleFund}
              >
                <ArrowRightLeft size={16} />
                Confirm Funding
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

        {/* ===== FUNDING STAGE ===== */}
        {stage === "funding" && (
          <motion.div
            key="funding"
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
                Funding...
              </p>
              <p className="text-spiceup-text-muted text-sm">
                Moving {parseFloat(amount).toFixed(4)} {token} to confidential balance
              </p>
            </div>
            <PrivacyBadge label="ZK Confidential" size="md" />
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
                Funding Complete!
              </p>
              <p className="text-spiceup-text-secondary text-sm">
                {parseFloat(amount).toFixed(4)} {token} added to your
                confidential balance
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
                Fund More
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
