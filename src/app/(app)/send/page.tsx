"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/useApiClient";
import { useBalance } from "@/hooks/useBalance";
import { ENV } from "@/lib/env";
import { formatBalance, shortenAddress } from "@/lib/format";
import { parseTongoQr } from "@/lib/tongo";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { useWalletStore, type TokenBalance } from "@/stores/wallet";
import { AmountInput } from "@/components/AmountInput";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type SendStage = "input" | "review";
type SendMode = "public" | "private";

interface SendResponse {
  txHash: string;
  deploymentTxHash: string | null;
  deployedBeforeSend: boolean;
  balances: Record<string, TokenBalance>;
  transaction: {
    id: string;
    type: string;
    amount: string;
    token: string;
    counterparty: string;
    timestamp: number;
    txHash: string | null;
    isPrivate: boolean;
  };
}

const slideVariants = {
  enter: { x: 30, opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: -30, opacity: 0 },
};

function isLikelyStarknetAddress(value: string) {
  return /^0x[0-9a-fA-F]+$/.test(value.trim()) && value.trim().length >= 10;
}

export default function SendPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const api = useApiClient();
  const privyUserId = useAuthStore((s) => s.privyUserId);
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const balances = useWalletStore((s) => s.balances);
  const setBalances = useWalletStore((s) => s.setBalances);
  const addToast = useToastStore((s) => s.addToast);
  const { loading: balanceLoading, refresh: refreshBalances } = useBalance();

  const [stage, setStage] = useState<SendStage>("input");
  const [mode, setMode] = useState<SendMode>("public");
  const [recipient, setRecipient] = useState("");
  const [token, setToken] = useState("ETH");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState("");

  const isPrivate = mode === "private";
  const maxBalance = useMemo(() => {
    if (balanceLoading) return "";
    return balances[token]?.amount ?? "0";
  }, [balanceLoading, balances, token]);

  const amountError = useMemo(() => {
    if (balanceLoading || !amount || parseFloat(amount) <= 0) return "";

    if (parseFloat(amount) > parseFloat(maxBalance || "0")) {
      return `Insufficient ${token} balance`;
    }

    return "";
  }, [amount, balanceLoading, maxBalance, token]);

  const recipientError = useMemo(() => {
    if (!recipient.trim()) return "";

    if (isPrivate) {
      if (!parseTongoQr(recipient.trim())) {
        return "Invalid Tongo address. Expected format: tongo:x:y";
      }

      return "";
    }

    if (!isLikelyStarknetAddress(recipient)) {
      return "Enter a valid Starknet address starting with 0x";
    }

    return "";
  }, [isPrivate, recipient]);

  const canProceed =
    !balanceLoading &&
    amount &&
    parseFloat(amount) > 0 &&
    !amountError &&
    recipient.trim() &&
    !recipientError;

  const handleReview = useCallback(() => {
    if (!canProceed || isSubmitting) return;

    setError("");
    setStage("review");
  }, [canProceed, isSubmitting]);

  const handleBack = useCallback(() => {
    if (isSubmitting) return;

    if (stage === "review") {
      setStage("input");
      return;
    }

    router.push("/home");
  }, [isSubmitting, router, stage]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;

    if (isPrivate) {
      const message =
        "Private send will come next once the Tongo execution rail is connected.";
      setError(message);
      addToast({
        type: "warning",
        title: "Private send not live yet",
        message,
      });
      return;
    }

    if (!canProceed) return;

    setError("");
    setIsSubmitting(true);
    setSubmitStatus(
      "Preparing your sponsored Starknet transfer. First sends can take a little longer."
    );

    try {
      const response = await api<SendResponse>("/api/send", {
        method: "POST",
        body: {
          mode,
          recipient: recipient.trim(),
          token,
          amount,
        },
      });

      setBalances(response.balances);

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["balances", privyUserId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["transactions", privyUserId],
        }),
      ]);

      addToast({
        type: "success",
        title: "Transfer sent",
        message: response.deploymentTxHash
          ? "Your Starknet account was prepared and the payment was sent successfully."
          : "Your sponsored Starknet transfer was sent successfully.",
      });

      router.push("/home");
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while sending your transfer.";

      setError(message);
      addToast({
        type: "error",
        title: "Send failed",
        message,
      });
    } finally {
      setIsSubmitting(false);
      setSubmitStatus("");
      await refreshBalances().catch(() => undefined);
    }
  }, [
    addToast,
    amount,
    api,
    canProceed,
    isPrivate,
    isSubmitting,
    mode,
    privyUserId,
    queryClient,
    recipient,
    refreshBalances,
    router,
    setBalances,
    token,
  ]);

  const formattedAmount = formatBalance(amount);
  const networkLabel =
    ENV.NETWORK === "mainnet" ? "Starknet Mainnet" : "Starknet Sepolia";
  const availableLabel = balanceLoading ? "Checking..." : `${maxBalance || "0"} ${token}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto min-h-screen max-w-2xl px-5 pb-8 pt-5"
    >
      <div className="mb-6 flex items-center gap-3">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleBack}
          className="p-1 text-spiceup-text-muted transition-colors hover:text-white disabled:opacity-40"
          aria-label="Go back"
          disabled={isSubmitting}
        >
          <ArrowLeft size={22} />
        </motion.button>
        <h1 className="text-lg font-bold tracking-tight text-white">Send</h1>
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
            <div className="flex rounded-xl border border-spiceup-border bg-spiceup-surface p-1">
              {(["public", "private"] as const).map((currentMode) => (
                <button
                  key={currentMode}
                  onClick={() => setMode(currentMode)}
                  disabled={isSubmitting}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2.5 text-sm font-medium transition-all ${
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
                className="flex items-start gap-2.5 rounded-xl border border-spiceup-accent/20 bg-spiceup-accent/10 p-3.5"
              >
                <Lock size={14} className="mt-0.5 shrink-0 text-spiceup-accent" />
                <p className="text-xs leading-relaxed text-spiceup-accent">
                  Private transfers stay visible in the flow, but execution is
                  still gated until the Tongo rail is wired end to end.
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
              disabled={balanceLoading || isSubmitting}
            />

            <div className="flex items-center justify-between rounded-xl border border-spiceup-border/50 bg-spiceup-surface/50 p-3.5">
              <span className="text-xs text-spiceup-text-muted">
                Available {token}
              </span>
              <span className="text-xs font-semibold text-white">
                {availableLabel}
              </span>
            </div>

            {balanceLoading && (
              <div className="flex items-center justify-center gap-2 text-sm text-spiceup-text-secondary">
                <Loader2 size={14} className="animate-spin" />
                Checking live balances from Starknet...
              </div>
            )}

            {error && <p className="text-center text-sm text-red-400">{error}</p>}

            <Button
              variant="primary"
              size="lg"
              className={`w-full gap-2 ${
                canProceed ? "shadow-lg shadow-spiceup-accent/20" : ""
              }`}
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
            <div className="space-y-5 rounded-2xl border border-spiceup-border bg-spiceup-surface p-6">
              <div className="text-center">
                <p className="mb-2 text-sm text-spiceup-text-secondary">
                  You&apos;re preparing
                </p>
                <p className="text-4xl font-bold tracking-tight text-white">
                  {formattedAmount}
                </p>
                <p className="mt-1 text-sm text-spiceup-text-muted">{token}</p>
              </div>

              <div className="h-px bg-spiceup-border" />

              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-spiceup-text-muted">To</span>
                  <span className="rounded-lg bg-white/5 px-2.5 py-1 text-sm font-mono text-white">
                    {shortenAddress(recipient.trim(), 8)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-spiceup-text-muted">Network</span>
                  <span className="text-sm text-white">{networkLabel}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-spiceup-text-muted">Type</span>
                  <div className="flex items-center gap-1.5">
                    {isPrivate ? (
                      <PrivacyBadge label="Private" size="sm" />
                    ) : (
                      <span className="rounded-lg bg-white/5 px-2.5 py-1 text-sm text-white">
                        Public
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-spiceup-text-muted">From</span>
                  <span className="text-sm font-mono text-white">
                    {starknetAddress ? shortenAddress(starknetAddress, 6) : "Provisioning..."}
                  </span>
                </div>
              </div>

              <div
                className={`rounded-xl border p-3.5 ${
                  isPrivate
                    ? "border-spiceup-warning/20 bg-spiceup-warning/10"
                    : "border-spiceup-success/20 bg-spiceup-success/10"
                }`}
              >
                <p
                  className={`text-xs leading-relaxed ${
                    isPrivate ? "text-spiceup-warning" : "text-spiceup-success"
                  }`}
                >
                  {isPrivate
                    ? "Private execution is still gated while the confidential Tongo path is connected."
                    : "Sponsored public send is live. If this is your first on-chain action, SpiceUP may prepare your Starknet account before sending."}
                </p>
              </div>

              {submitStatus && (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-spiceup-border/60 bg-black/10 p-3 text-sm text-spiceup-text-secondary">
                  <Loader2 size={14} className="animate-spin" />
                  {submitStatus}
                </div>
              )}
            </div>

            {error && <p className="text-center text-sm text-red-400">{error}</p>}

            <div className="space-y-3">
              <Button
                variant={isPrivate ? "secondary" : "primary"}
                size="lg"
                className="w-full gap-2"
                onClick={handleSubmit}
                loading={isSubmitting}
              >
                <Send size={16} />
                {isPrivate ? "Private Send Coming Next" : "Send Now"}
              </Button>

              <Button
                variant="ghost"
                size="md"
                className="w-full"
                onClick={() => setStage("input")}
                disabled={isSubmitting}
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
