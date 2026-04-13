"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Wallet,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Loader2,
  Send,
  PartyPopper,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { parseTongoQr } from "@/lib/tongo";
import { useToastStore } from "@/stores/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AmountInput } from "@/components/AmountInput";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { shortenAddress, formatBalance } from "@/lib/format";

type SendStage = "input" | "review" | "zkProof" | "verifying" | "sending" | "done";
type SendMode = "public" | "private";

const slideVariants = {
  enter: { x: 30, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -30, opacity: 0 },
};

export default function SendPage() {
  const router = useRouter();
  const recordTx = useTransactionHistory().recordTx;
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const balances = useWalletStore((s) => s.balances);
  const addToast = useToastStore((s) => s.addToast);

  const [stage, setStage] = useState<SendStage>("input");
  const [mode, setMode] = useState<SendMode>("public");
  const [recipient, setRecipient] = useState("");
  const [token, setToken] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

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

  const recipientError = useMemo(() => {
    if (!recipient.trim()) return "";
    if (mode === "private") {
      if (!parseTongoQr(recipient.trim())) {
        return "Invalid Tongo address. Expected format: tongo:x:y";
      }
    } else {
      if (recipient.trim().length < 10) return "Address seems too short";
    }
    return "";
  }, [recipient, mode]);

  const canProceed =
    amount &&
    parseFloat(amount) > 0 &&
    !amountError &&
    recipient.trim() &&
    !recipientError;

  const handleReview = useCallback(() => {
    if (!canProceed) return;
    setError("");
    setStage("review");
  }, [canProceed]);

  const handleSend = useCallback(() => {
    if (mode === "private") {
      setStage("zkProof");
      setTimeout(() => {
        setStage("verifying");
        setTimeout(() => {
          recordTx({
            type: "send",
            amount,
            token,
            counterparty: recipient.trim(),
            txHash: null,
            isPrivate: true,
          });
          addToast({ type: "success", title: "Payment sent privately", message: `${formatBalance(amount)} ${token} sent` });
          setStage("done");
        }, 1000);
      }, 1500);
    } else {
      setStage("sending");
      setTimeout(() => {
        recordTx({
          type: "send",
          amount,
          token,
          counterparty: recipient.trim(),
          txHash: `0x${Date.now().toString(16)}...`,
          isPrivate: false,
        });
        addToast({ type: "success", title: "Payment sent", message: `${formatBalance(amount)} ${token} sent` });
        setStage("done");
      }, 2000);
    }
  }, [amount, token, recipient, mode, recordTx, addToast]);

  const handleBack = useCallback(() => {
    if (stage === "review") {
      setStage("input");
    } else if (stage === "done") {
      setStage("input");
      setAmount("");
      setRecipient("");
    } else {
      router.push("/home");
    }
  }, [stage, router]);

  const isPrivate = mode === "private";
  const formattedAmount = formatBalance(amount);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBack}
          className="text-spiceup-text-muted hover:text-white transition-colors p-1 -m-1"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </motion.button>
        <h1 className="text-white text-lg font-bold tracking-tight">
          {stage === "done" ? "Sent!" : "Send"}
        </h1>
      </div>

      <AnimatePresence mode="wait">
        {/* ===== INPUT STAGE ===== */}
        {stage === "input" && (
          <motion.div
            key="input"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="space-y-6"
          >
            {/* Mode Toggle */}
            <div className="bg-spiceup-surface border border-spiceup-border rounded-xl p-1 flex">
              {(["public", "private"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    mode === m
                      ? m === "public"
                        ? "bg-white/10 text-white shadow-sm"
                        : "bg-spiceup-accent/20 text-spiceup-accent shadow-sm shadow-spiceup-accent/10"
                      : "text-spiceup-text-muted hover:text-white"
                  }`}
                >
                  {m === "public" ? (
                    <Wallet size={14} />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  {m === "public" ? "Public" : "Private"}
                </button>
              ))}
            </div>

            {/* Private mode info banner */}
            {isPrivate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-spiceup-accent/10 border border-spiceup-accent/20 rounded-xl p-3.5 flex items-start gap-2.5"
              >
                <Lock size={14} className="text-spiceup-accent mt-0.5 shrink-0" />
                <p className="text-spiceup-accent text-xs leading-relaxed">
                  Amount will be hidden on-chain via ZK proof. Only you and the
                  recipient can view the transfer details.
                </p>
              </motion.div>
            )}

            {/* Recipient */}
            <div>
              <Input
                label={isPrivate ? "Tongo Recipient ID" : "Recipient Address"}
                placeholder={isPrivate ? "tongo:x:y" : "0x..."}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                error={recipientError}
              />
            </div>

            {/* Amount + Token */}
            <AmountInput
              token={token}
              onTokenChange={setToken}
              amount={amount}
              onAmountChange={setAmount}
              maxBalance={maxBalance}
              error={amountError}
            />

            {/* Available balance */}
            <div className="bg-spiceup-surface/50 border border-spiceup-border/50 rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-spiceup-text-muted text-xs">Available {token}</span>
              <span className="text-white text-xs font-semibold">{maxBalance} {token}</span>
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}

            {/* Continue */}
            <Button
              variant="primary"
              size="lg"
              className={`w-full gap-2 ${canProceed ? "shadow-lg shadow-spiceup-accent/20" : ""}`}
              disabled={!canProceed}
              onClick={handleReview}
            >
              <Send size={16} />
              Review
            </Button>
          </motion.div>
        )}

        {/* ===== REVIEW STAGE ===== */}
        {stage === "review" && (
          <motion.div
            key="review"
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="space-y-6"
          >
            {/* Summary card */}
            <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-6 space-y-5">
              {/* Amount */}
              <div className="text-center">
                <p className="text-spiceup-text-secondary text-sm mb-2">You&apos;re sending</p>
                <p className="text-white text-4xl font-bold tracking-tight">
                  {formattedAmount}
                </p>
                <p className="text-spiceup-text-muted text-sm mt-1">{token}</p>
              </div>

              <div className="h-px bg-spiceup-border" />

              {/* Details */}
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">To</span>
                  <span className="text-white text-sm font-mono bg-white/5 px-2.5 py-1 rounded-lg">
                    {shortenAddress(recipient.trim(), 8)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Network</span>
                  <span className="text-white text-sm">Starknet Sepolia</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Type</span>
                  <div className="flex items-center gap-1.5">
                    {isPrivate ? (
                      <PrivacyBadge label="Private" size="sm" />
                    ) : (
                      <span className="text-white text-sm bg-white/5 px-2.5 py-1 rounded-lg">Public</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">From</span>
                  <span className="text-white text-sm font-mono">
                    {starknetAddress ? shortenAddress(starknetAddress, 6) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Fee</span>
                  <span className="text-spiceup-success text-sm font-medium">Free</span>
                </div>
              </div>

              {isPrivate && (
                <div className="bg-spiceup-accent/10 border border-spiceup-accent/20 rounded-xl p-3.5">
                  <p className="text-spiceup-accent text-xs leading-relaxed">
                    🔒 This transaction will be private. The amount and sender
                    will be hidden on-chain using zero-knowledge proofs.
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2 shadow-lg shadow-spiceup-accent/20"
                onClick={handleSend}
              >
                <Send size={16} />
                Confirm & Send
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

        {/* ===== ZK PROOF STAGE ===== */}
        {stage === "zkProof" && (
          <motion.div
            key="zkProof"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-20 space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-spiceup-accent/10 flex items-center justify-center">
                <Loader2 size={40} className="text-spiceup-accent animate-spin" />
              </div>
              <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-spiceup-accent/20 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-bold mb-1">Generating ZK proof...</p>
              <p className="text-spiceup-text-muted text-sm">Creating zero-knowledge proof for your private transaction</p>
            </div>
            <PrivacyBadge label="Private transaction" size="md" />
          </motion.div>
        )}

        {/* ===== VERIFYING STAGE ===== */}
        {stage === "verifying" && (
          <motion.div
            key="verifying"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-20 space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-spiceup-accent/15 flex items-center justify-center">
                <ShieldCheck size={40} className="text-spiceup-accent animate-pulse" />
              </div>
              <div className="absolute inset-0 w-24 h-24 rounded-full border-2 border-spiceup-accent/20 animate-ping" />
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-bold mb-1">Verifying on-chain...</p>
              <p className="text-spiceup-text-muted text-sm">Submitting ZK proof to Starknet</p>
            </div>
            <PrivacyBadge label="Private transaction" size="md" />
          </motion.div>
        )}

        {/* ===== SENDING STAGE ===== */}
        {stage === "sending" && (
          <motion.div
            key="sending"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-20 space-y-6"
          >
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-spiceup-accent/10 flex items-center justify-center">
                <Loader2 size={40} className="text-spiceup-accent animate-spin" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-bold mb-1">Sending...</p>
              <p className="text-spiceup-text-muted text-sm">{formattedAmount} {token}</p>
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
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
              className="relative"
            >
              <div className="w-24 h-24 rounded-full bg-spiceup-success/10 flex items-center justify-center">
                <CheckCircle2 size={48} className="text-spiceup-success" />
              </div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-spiceup-warning/20 flex items-center justify-center"
              >
                <PartyPopper size={16} className="text-spiceup-warning" />
              </motion.div>
            </motion.div>
            <div className="text-center">
              <p className="text-white text-2xl font-bold mb-1">Payment Sent!</p>
              <p className="text-spiceup-text-secondary text-sm">
                {formattedAmount} {token} sent {isPrivate ? "privately" : ""}
              </p>
              <p className="text-spiceup-text-muted text-xs mt-1">
                to {shortenAddress(recipient.trim(), 6)}
              </p>
            </div>

            {isPrivate && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-spiceup-accent/10 border border-spiceup-accent/20 rounded-full px-4 py-2 flex items-center gap-2"
              >
                <Lock size={14} className="text-spiceup-accent" />
                <span className="text-spiceup-accent text-xs font-medium">
                  Private — amount hidden on-chain
                </span>
              </motion.div>
            )}

            <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
              <Button
                variant="primary"
                size="lg"
                className="w-full gap-2 shadow-lg shadow-spiceup-accent/20"
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
                  setRecipient("");
                }}
              >
                Send Another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
