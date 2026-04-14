"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Wallet,
  ShieldCheck,
  Lock,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useWalletStore } from "@/stores/wallet";
import { parseTongoQr } from "@/lib/tongo";
import { useToastStore } from "@/stores/toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AmountInput } from "@/components/AmountInput";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { ENV } from "@/lib/env";
import { shortenAddress, formatBalance } from "@/lib/format";

type SendStage = "input" | "review";
type SendMode = "public" | "private";

const slideVariants = {
  enter: { x: 30, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -30, opacity: 0 },
};

export default function SendPage() {
  const router = useRouter();
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
    const balance = balances[token];
    return balance?.amount ?? "0";
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
    } else if (recipient.trim().length < 10) {
      return "Address seems too short";
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

  const handleSendUnavailable = useCallback(() => {
    const message = "Live wallet execution is not connected yet in this branch.";
    setError(message);
    addToast({
      type: "warning",
      title: "Send not live yet",
      message:
        "Review is available, but on-chain execution is still being wired in.",
    });
  }, [addToast]);

  const handleBack = useCallback(() => {
    if (stage === "review") {
      setStage("input");
      return;
    }

    router.push("/home");
  }, [router, stage]);

  const isPrivate = mode === "private";
  const formattedAmount = formatBalance(amount);
  const networkLabel = ENV.NETWORK === "mainnet" ? "Starknet Mainnet" : "Starknet Sepolia";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen"
    >
      <div className="flex items-center gap-3 mb-6">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBack}
          className="text-spiceup-text-muted hover:text-white transition-colors p-1 -m-1"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </motion.button>
        <h1 className="text-white text-lg font-bold tracking-tight">Send</h1>
      </div>

      <AnimatePresence mode="wait">
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
            <div className="bg-spiceup-surface border border-spiceup-border rounded-xl p-1 flex">
              {(["public", "private"] as const).map((currentMode) => (
                <button
                  key={currentMode}
                  onClick={() => setMode(currentMode)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    mode === currentMode
                      ? currentMode === "public"
                        ? "bg-white/10 text-white shadow-sm"
                        : "bg-spiceup-accent/20 text-spiceup-accent shadow-sm shadow-spiceup-accent/10"
                      : "text-spiceup-text-muted hover:text-white"
                  }`}
                >
                  {currentMode === "public" ? (
                    <Wallet size={14} />
                  ) : (
                    <ShieldCheck size={14} />
                  )}
                  {currentMode === "public" ? "Public" : "Private"}
                </button>
              ))}
            </div>

            {isPrivate && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-spiceup-accent/10 border border-spiceup-accent/20 rounded-xl p-3.5 flex items-start gap-2.5"
              >
                <Lock size={14} className="text-spiceup-accent mt-0.5 shrink-0" />
                <p className="text-spiceup-accent text-xs leading-relaxed">
                  Private transfers will eventually hide amount details on-chain.
                  For now, this branch supports review only while execution is
                  being wired in.
                </p>
              </motion.div>
            )}

            <Input
              label={isPrivate ? "Tongo Recipient ID" : "Recipient Address"}
              placeholder={isPrivate ? "tongo:x:y" : "0x..."}
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              error={recipientError}
            />

            <AmountInput
              token={token}
              onTokenChange={setToken}
              amount={amount}
              onAmountChange={setAmount}
              maxBalance={maxBalance}
              error={amountError}
            />

            <div className="bg-spiceup-surface/50 border border-spiceup-border/50 rounded-xl p-3.5 flex items-center justify-between">
              <span className="text-spiceup-text-muted text-xs">
                Available {token}
              </span>
              <span className="text-white text-xs font-semibold">
                {maxBalance} {token}
              </span>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

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
            <div className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-6 space-y-5">
              <div className="text-center">
                <p className="text-spiceup-text-secondary text-sm mb-2">
                  You&apos;re preparing
                </p>
                <p className="text-white text-4xl font-bold tracking-tight">
                  {formattedAmount}
                </p>
                <p className="text-spiceup-text-muted text-sm mt-1">{token}</p>
              </div>

              <div className="h-px bg-spiceup-border" />

              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">To</span>
                  <span className="text-white text-sm font-mono bg-white/5 px-2.5 py-1 rounded-lg">
                    {shortenAddress(recipient.trim(), 8)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Network</span>
                  <span className="text-white text-sm">{networkLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">Type</span>
                  <div className="flex items-center gap-1.5">
                    {isPrivate ? (
                      <PrivacyBadge label="Private" size="sm" />
                    ) : (
                      <span className="text-white text-sm bg-white/5 px-2.5 py-1 rounded-lg">
                        Public
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-spiceup-text-muted text-sm">From</span>
                  <span className="text-white text-sm font-mono">
                    {starknetAddress ? shortenAddress(starknetAddress, 6) : "—"}
                  </span>
                </div>
              </div>

              <div className="bg-spiceup-warning/10 border border-spiceup-warning/20 rounded-xl p-3.5">
                <p className="text-spiceup-warning text-xs leading-relaxed">
                  This review is live, but execution is not. SpiceUP will not
                  submit an on-chain payment from this screen until wallet
                  sending is connected to a real backend and signer flow.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="secondary"
                size="lg"
                className="w-full gap-2"
                onClick={handleSendUnavailable}
              >
                <Send size={16} />
                Live Send Not Connected Yet
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
      </AnimatePresence>
    </motion.div>
  );
}
