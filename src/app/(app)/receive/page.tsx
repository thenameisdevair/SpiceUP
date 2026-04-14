"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  Copy,
  Loader2,
  Share2,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { useBalance } from "@/hooks/useBalance";
import { ENV } from "@/lib/env";
import { formatBalance } from "@/lib/format";
import { parseTongoQr } from "@/lib/tongo";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { LAUNCH_FEATURES } from "@/constants/features";

type ReceiveMode = "public" | "private";

const motionVariants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function ReceivePage() {
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const tongoRecipientId = useAuthStore((s) => s.tongoRecipientId);
  const { balances, loading } = useBalance();

  const [mode, setMode] = useState<ReceiveMode>("public");
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const privateReady =
    LAUNCH_FEATURES.confidentialTransfers &&
    !!tongoRecipientId &&
    !!parseTongoQr(tongoRecipientId);
  const networkLabel =
    ENV.NETWORK === "mainnet" ? "Starknet Mainnet" : "Starknet Sepolia";
  const publicValue = starknetAddress;
  const privateValue = privateReady ? tongoRecipientId : null;
  const currentValue = mode === "public" ? publicValue : privateValue;

  const balanceCards = useMemo(
    () => [
      {
        symbol: "ETH",
        amount: balances.ETH?.amount ?? "0",
        tone: "bg-blue-500/12 text-blue-200 border-blue-400/20",
      },
      {
        symbol: "STRK",
        amount: balances.STRK?.amount ?? "0",
        tone: "bg-amber-500/12 text-amber-100 border-amber-400/20",
      },
      {
        symbol: "USDC",
        amount: balances.USDC?.amount ?? "0",
        tone: "bg-emerald-500/12 text-emerald-100 border-emerald-400/20",
      },
    ],
    [balances.ETH?.amount, balances.STRK?.amount, balances.USDC?.amount]
  );

  const handleCopy = useCallback(async () => {
    if (!currentValue) return;

    try {
      await navigator.clipboard.writeText(currentValue);
      setCopied(true);
      addToast({
        type: "success",
        title: "Copied",
        message:
          mode === "public"
            ? "Your public receive address is ready to paste."
            : "Your private receive ID is ready to share.",
      });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      addToast({
        type: "error",
        title: "Copy failed",
        message: "Clipboard access was blocked on this device.",
      });
    }
  }, [addToast, currentValue, mode]);

  const handleShare = useCallback(async () => {
    if (!currentValue || typeof navigator === "undefined") return;

    if (!("share" in navigator)) {
      addToast({
        type: "info",
        title: "Share unavailable",
        message: "Use copy instead on this browser.",
      });
      return;
    }

    try {
      setSharing(true);
      await navigator.share({
        title: mode === "public" ? "My SpiceUP receive address" : "My SpiceUP private receive ID",
        text:
          mode === "public"
            ? `Send to my SpiceUP wallet on ${networkLabel}: ${currentValue}`
            : `Use my SpiceUP private receive ID: ${currentValue}`,
      });
    } catch {
      // Ignore cancelled share sheets.
    } finally {
      setSharing(false);
    }
  }, [addToast, currentValue, mode, networkLabel]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="mx-auto min-h-screen max-w-6xl px-5 pb-10 pt-5"
    >
      <div className="mb-6 flex items-center gap-3">
        <button
          onClick={() => router.push("/home")}
          className="p-1 text-spiceup-text-muted transition-colors hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-white">Receive</h1>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[30px] border border-spiceup-border bg-[radial-gradient(circle_at_top_left,rgba(255,164,92,0.16),transparent_40%),linear-gradient(155deg,rgba(18,18,18,0.98),rgba(10,10,10,0.88))] p-6 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-spiceup-text-secondary">
              Receive Rail
            </span>
            <span className="rounded-full border border-spiceup-accent/30 bg-spiceup-accent/12 px-3 py-1 text-xs font-medium text-spiceup-accent">
              {networkLabel}
            </span>
          </div>

          <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-[2.45rem]">
            Make getting paid feel clean enough to share instantly.
          </h2>
          <p className="mt-4 max-w-[64ch] text-sm leading-7 text-spiceup-text-secondary sm:text-[15px]">
            This is the screen you can drop into a group chat, send to a helper,
            or use for a direct wallet top-up. Keep it simple, readable, and
            hard to misuse.
          </p>
        </div>

        <div className="rounded-[30px] border border-spiceup-border bg-spiceup-surface/80 p-6">
          <div className="flex rounded-2xl border border-spiceup-border bg-black/15 p-1">
            {(["public", "private"] as const).map((currentMode) => (
              <button
                key={currentMode}
                onClick={() => setMode(currentMode)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all ${
                  mode === currentMode
                    ? currentMode === "public"
                      ? "bg-white/10 text-white"
                      : "bg-spiceup-accent/18 text-spiceup-accent"
                    : "text-spiceup-text-muted hover:text-white"
                }`}
              >
                {currentMode === "public" ? (
                  <Wallet size={15} />
                ) : (
                  <ShieldCheck size={15} />
                )}
                {currentMode === "public" ? "Public" : "Private"}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-spiceup-border/70 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                Sender fit
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                Friends, wallets, exchanges
              </p>
            </div>
            <div className="rounded-2xl border border-spiceup-border/70 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                Live now
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                Public receive
              </p>
            </div>
            <div className="rounded-2xl border border-spiceup-border/70 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                Status
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {loading ? "Checking..." : "Live balances loaded"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {mode === "public" ? (
          <motion.div
            key="public"
            variants={motionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]"
          >
            <div className="rounded-[30px] border border-spiceup-border bg-spiceup-surface p-6 sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-spiceup-text-muted">
                    Shareable Route In
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    Public receive address
                  </h3>
                </div>
                <span className="rounded-full border border-spiceup-success/25 bg-spiceup-success/10 px-3 py-1 text-xs font-medium text-spiceup-success">
                  Ready to share
                </span>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-spiceup-border/80 bg-black/15 p-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                      Full Address
                    </p>
                    <p className="break-all font-mono text-sm leading-7 text-white">
                      {publicValue ?? "Provisioning your Starknet address..."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      size="lg"
                      className="gap-2"
                      onClick={handleCopy}
                      disabled={!publicValue}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Copied" : "Copy Address"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="gap-2"
                      onClick={handleShare}
                      disabled={!publicValue || sharing}
                    >
                      <Share2 size={16} />
                      {sharing ? "Opening Share..." : "Share"}
                    </Button>
                  </div>

                  <div className="rounded-[24px] border border-spiceup-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-spiceup-text-muted">
                      Sender checklist
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/6 bg-black/10 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-spiceup-text-muted">
                          Network
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white">
                          Sender must choose {networkLabel}.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/6 bg-black/10 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-spiceup-text-muted">
                          Tokens
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white">
                          ETH, STRK, and USDC are the clean supported path.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/6 bg-black/10 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-spiceup-text-muted">
                          Best use
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white">
                          Ideal for split bills, remittance top-ups, and direct support.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-spiceup-border/70 bg-black/15 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Users size={15} className="text-spiceup-accent" />
                    <p className="text-sm font-medium text-white">Scan and send</p>
                  </div>

                  <div className="mx-auto mb-4 flex w-fit items-center justify-center rounded-[28px] bg-white p-4 shadow-[0_16px_60px_-28px_rgba(255,255,255,0.55)]">
                    <QRCodeSVG
                      value={publicValue || "0x0"}
                      size={228}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#080808"
                      includeMargin={false}
                    />
                  </div>

                  <p className="text-center text-xs leading-6 text-spiceup-text-secondary">
                    Use this when someone is sending from another wallet, or when
                    you want a cleaner handoff than a long pasted address.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[30px] border border-spiceup-border bg-spiceup-surface p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-spiceup-text-muted">
                      Live Snapshot
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                      See what has already landed.
                    </h3>
                  </div>
                  {loading && <Loader2 size={16} className="animate-spin text-spiceup-accent" />}
                </div>

                <div className="grid gap-3">
                  {balanceCards.map((item) => (
                    <div
                      key={item.symbol}
                      className={`rounded-[22px] border p-4 ${item.tone}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-current/70">
                            {item.symbol}
                          </p>
                          <p className="mt-2 text-2xl font-semibold tracking-tight text-white">
                            {loading ? "..." : formatBalance(item.amount)}
                          </p>
                        </div>
                        <div className="text-right text-xs leading-5 text-current/80">
                          <p>Live from chain</p>
                          <p>Ready for send</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-spiceup-border bg-spiceup-surface p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-spiceup-text-muted">
                  Action Links
                </p>
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => router.push("/fund")}
                    className="flex w-full items-center justify-between rounded-[22px] border border-spiceup-border/80 bg-black/10 px-4 py-4 text-left transition-colors hover:border-spiceup-accent/30 hover:bg-black/20"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">Open add-funds flow</p>
                      <p className="mt-1 text-xs leading-5 text-spiceup-text-secondary">
                        Better for self-funding from an exchange or another wallet.
                      </p>
                    </div>
                    <Wallet size={16} className="text-spiceup-text-muted" />
                  </button>

                  <button
                    onClick={() => router.push("/send")}
                    className="flex w-full items-center justify-between rounded-[22px] border border-spiceup-border/80 bg-black/10 px-4 py-4 text-left transition-colors hover:border-spiceup-accent/30 hover:bg-black/20"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">Go to send</p>
                      <p className="mt-1 text-xs leading-5 text-spiceup-text-secondary">
                        Once money arrives, send it onward without changing rails.
                      </p>
                    </div>
                    <Wallet size={16} className="text-spiceup-text-muted" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="private"
            variants={motionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]"
          >
            <div className="rounded-[30px] border border-spiceup-accent/20 bg-[radial-gradient(circle_at_top_left,rgba(255,164,92,0.18),transparent_40%),linear-gradient(180deg,rgba(255,164,92,0.08),rgba(255,164,92,0.03))] p-6 sm:p-7">
              <div className="mb-4 flex items-center gap-2">
                <PrivacyBadge label="Private" size="md" />
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white">
                  Not live yet
                </span>
              </div>

              <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-white">
                Private receive will be strong when it is real.
              </h2>
              <p className="mt-4 max-w-[62ch] text-sm leading-7 text-spiceup-text-secondary sm:text-[15px]">
                This build does not expose a fake confidential receive ID. Public
                receive is live today, and the private path will appear here only
                when the Tongo-backed flow is truly wired end to end.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                    Today
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white">
                    Public receive is the clean path for active use.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                    Later
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white">
                    Confidential receive appears when the private rail can actually settle.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                    Principle
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white">
                    No invisible traps, no dead buttons disguised as features.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  className="gap-2"
                  onClick={() => setMode("public")}
                >
                  <Wallet size={16} />
                  Use Public Receive
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2"
                  onClick={() => router.push("/fund")}
                >
                  <Copy size={16} />
                  Open Add Funds
                </Button>
              </div>
            </div>

            <div className="rounded-[30px] border border-spiceup-border bg-spiceup-surface p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-spiceup-text-muted">
                Best current path
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-spiceup-border/80 bg-black/10 p-4">
                  <p className="text-sm font-medium text-white">1. Share public receive</p>
                  <p className="mt-1 text-xs leading-6 text-spiceup-text-secondary">
                    Let the sender use the address on the public tab right now.
                  </p>
                </div>
                <div className="rounded-[22px] border border-spiceup-border/80 bg-black/10 p-4">
                  <p className="text-sm font-medium text-white">2. Confirm balance lands</p>
                  <p className="mt-1 text-xs leading-6 text-spiceup-text-secondary">
                    Live balances already reflect what has reached your wallet.
                  </p>
                </div>
                <div className="rounded-[22px] border border-spiceup-border/80 bg-black/10 p-4">
                  <p className="text-sm font-medium text-white">3. Use send or groups</p>
                  <p className="mt-1 text-xs leading-6 text-spiceup-text-secondary">
                    Once funds are in, the public action flow is already live.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
