"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  Loader2,
  RefreshCw,
  Share2,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { useBalance } from "@/hooks/useBalance";
import { ENV } from "@/lib/env";
import { formatBalance } from "@/lib/format";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";

type FundMode = "public" | "private";

const motionVariants = {
  enter: { opacity: 0, y: 18 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

export default function FundPage() {
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const { balances, loading, refresh } = useBalance();

  const [mode, setMode] = useState<FundMode>("public");
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  const networkLabel =
    ENV.NETWORK === "mainnet" ? "Starknet Mainnet" : "Starknet Sepolia";

  const balanceCards = useMemo(
    () => [
      {
        symbol: "ETH",
        tone: "bg-blue-500/12 text-blue-200 border-blue-400/20",
        amount: balances.ETH?.amount ?? "0",
      },
      {
        symbol: "STRK",
        tone: "bg-amber-500/12 text-amber-100 border-amber-400/20",
        amount: balances.STRK?.amount ?? "0",
      },
      {
        symbol: "USDC",
        tone: "bg-emerald-500/12 text-emerald-100 border-emerald-400/20",
        amount: balances.USDC?.amount ?? "0",
      },
    ],
    [balances.ETH?.amount, balances.STRK?.amount, balances.USDC?.amount]
  );

  const handleCopy = useCallback(async () => {
    if (!starknetAddress) return;

    try {
      await navigator.clipboard.writeText(starknetAddress);
      setCopied(true);
      addToast({
        type: "success",
        title: "Address copied",
        message: "Your Starknet funding address is ready to paste anywhere.",
      });
      setTimeout(() => setCopied(false), 1800);
    } catch {
      addToast({
        type: "error",
        title: "Copy failed",
        message: "Clipboard access was blocked on this device.",
      });
    }
  }, [addToast, starknetAddress]);

  const handleShare = useCallback(async () => {
    if (!starknetAddress || typeof navigator === "undefined") return;

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
        title: "My SpiceUP funding address",
        text: `Send to my SpiceUP wallet on ${networkLabel}: ${starknetAddress}`,
      });
    } catch {
      // Ignore cancelled share sheets.
    } finally {
      setSharing(false);
    }
  }, [addToast, networkLabel, starknetAddress]);

  const handleRefresh = useCallback(async () => {
    try {
      await refresh();
      addToast({
        type: "success",
        title: "Balances refreshed",
        message: "Live wallet balances were pulled from Starknet again.",
      });
    } catch (error) {
      addToast({
        type: "error",
        title: "Refresh failed",
        message:
          error instanceof Error
            ? error.message
            : "Could not refresh balances right now.",
      });
    }
  }, [addToast, refresh]);

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
        <h1 className="text-lg font-bold tracking-tight text-white">Add Funds</h1>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="overflow-hidden rounded-[30px] border border-spiceup-border bg-[radial-gradient(circle_at_top_left,rgba(255,164,92,0.2),transparent_42%),linear-gradient(160deg,rgba(17,17,17,0.98),rgba(10,10,10,0.88))] p-6 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-spiceup-text-secondary">
              Set Live
            </span>
            <span className="rounded-full border border-spiceup-accent/30 bg-spiceup-accent/12 px-3 py-1 text-xs font-medium text-spiceup-accent">
              {networkLabel}
            </span>
          </div>

          <div className="max-w-3xl space-y-4">
            <h2 className="max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-[2.45rem]">
              Make the first deposit feel obvious, fast, and trustworthy.
            </h2>
            <p className="max-w-[60ch] text-sm leading-7 text-spiceup-text-secondary sm:text-[15px]">
              Public funding is live now. Get money into your wallet once, then
              use the same rail for sending, friend-to-friend payments, and
              group settlements without bouncing between screens.
            </p>
          </div>
        </div>

        <div className="rounded-[30px] border border-spiceup-border bg-spiceup-surface/80 p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-spiceup-text-muted">
                Funding Mode
              </p>
              <p className="mt-1 text-sm text-spiceup-text-secondary">
                Choose the live rail or inspect what&apos;s next.
              </p>
            </div>
          </div>

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
                {currentMode === "public" ? "Public Funding" : "Private Funding"}
              </button>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-spiceup-border/70 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                Deposit Rail
              </p>
              <p className="mt-2 text-sm font-medium text-white">Starknet only</p>
            </div>
            <div className="rounded-2xl border border-spiceup-border/70 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                Supported
              </p>
              <p className="mt-2 text-sm font-medium text-white">ETH, STRK, USDC</p>
            </div>
            <div className="rounded-2xl border border-spiceup-border/70 bg-black/10 p-4">
              <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                Balance State
              </p>
              <p className="mt-2 text-sm font-medium text-white">
                {loading ? "Checking live..." : "Live from chain"}
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
                    Your Deposit Address
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                    Fund this wallet from an exchange, another wallet, or a friend.
                  </h3>
                </div>
                <span className="rounded-full border border-spiceup-success/25 bg-spiceup-success/10 px-3 py-1 text-xs font-medium text-spiceup-success">
                  Public rail live
                </span>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                  <div className="rounded-[24px] border border-spiceup-border/80 bg-black/15 p-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                      Full Address
                    </p>
                    <p className="break-all font-mono text-sm leading-7 text-white">
                      {starknetAddress ?? "Provisioning your Starknet address..."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="primary"
                      size="lg"
                      className="gap-2"
                      onClick={handleCopy}
                      disabled={!starknetAddress}
                    >
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? "Copied" : "Copy Address"}
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="gap-2"
                      onClick={handleShare}
                      disabled={!starknetAddress || sharing}
                    >
                      <Share2 size={16} />
                      {sharing ? "Opening Share..." : "Share"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="lg"
                      className="gap-2"
                      onClick={handleRefresh}
                      loading={loading}
                    >
                      {!loading && <RefreshCw size={16} />}
                      Refresh Balances
                    </Button>
                  </div>

                  <div className="rounded-[24px] border border-spiceup-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-spiceup-text-muted">
                      Funding Rules
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/6 bg-black/10 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-spiceup-text-muted">
                          1. Choose token
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white">
                          Withdraw or send ETH, STRK, or USDC only.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/6 bg-black/10 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-spiceup-text-muted">
                          2. Use Starknet
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white">
                          The sender must choose {networkLabel}, not Ethereum or another chain.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/6 bg-black/10 p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-spiceup-text-muted">
                          3. Refresh after send
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white">
                          Once the deposit lands, pull live balances again from chain.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] border border-spiceup-border/70 bg-black/15 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles size={15} className="text-spiceup-accent" />
                    <p className="text-sm font-medium text-white">Scan to fund</p>
                  </div>

                  <div className="mx-auto mb-4 flex w-fit items-center justify-center rounded-[28px] bg-white p-4 shadow-[0_16px_60px_-28px_rgba(255,255,255,0.55)]">
                    <QRCodeSVG
                      value={starknetAddress || "0x0"}
                      size={228}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#080808"
                      includeMargin={false}
                    />
                  </div>

                  <p className="text-center text-xs leading-6 text-spiceup-text-secondary">
                    For best results, scan from another Starknet wallet or copy
                    this address into an exchange withdrawal screen that supports Starknet.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[30px] border border-spiceup-border bg-spiceup-surface p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-spiceup-text-muted">
                      Live Holdings
                    </p>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                      Watch money arrive before you use it.
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
                          <p>Available now</p>
                          <p>Ready for send</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[30px] border border-spiceup-border bg-spiceup-surface p-6">
                <p className="text-xs uppercase tracking-[0.24em] text-spiceup-text-muted">
                  Quick Paths
                </p>
                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => router.push("/receive")}
                    className="flex w-full items-center justify-between rounded-[22px] border border-spiceup-border/80 bg-black/10 px-4 py-4 text-left transition-colors hover:border-spiceup-accent/30 hover:bg-black/20"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">Open share-ready receive page</p>
                      <p className="mt-1 text-xs leading-5 text-spiceup-text-secondary">
                        Cleaner for group chats, helpers, and exchange operators.
                      </p>
                    </div>
                    <ArrowUpRight size={16} className="text-spiceup-text-muted" />
                  </button>

                  <button
                    onClick={() => router.push("/send")}
                    className="flex w-full items-center justify-between rounded-[22px] border border-spiceup-border/80 bg-black/10 px-4 py-4 text-left transition-colors hover:border-spiceup-accent/30 hover:bg-black/20"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">Go straight into send</p>
                      <p className="mt-1 text-xs leading-5 text-spiceup-text-secondary">
                        Once funds land, move them without leaving the main flow.
                      </p>
                    </div>
                    <ArrowUpRight size={16} className="text-spiceup-text-muted" />
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
                  Coming next
                </span>
              </div>

              <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-white">
                Private funding should feel deliberate, not fake.
              </h2>
              <p className="mt-4 max-w-[62ch] text-sm leading-7 text-spiceup-text-secondary sm:text-[15px]">
                The confidential rail is still being connected to real Tongo
                execution, so this build does not pretend it is live. Today&apos;s
                honest path is simple: fund the public wallet first, then use the
                private rail the moment it is actually ready.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                    Today
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white">
                    Public funding and public send are fully usable.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                    Next
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white">
                    Private receive and private funding turn on once execution is wired.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 p-4">
                  <p className="text-xs uppercase tracking-[0.22em] text-spiceup-text-muted">
                    Why
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white">
                    Better to be clear now than lose trust on first use.
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
                  Use Public Funding Now
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="gap-2"
                  onClick={() => router.push("/receive")}
                >
                  <ArrowUpRight size={16} />
                  Open Receive Page
                </Button>
              </div>
            </div>

            <div className="rounded-[30px] border border-spiceup-border bg-spiceup-surface p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-spiceup-text-muted">
                What to do instead
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[22px] border border-spiceup-border/80 bg-black/10 p-4">
                  <p className="text-sm font-medium text-white">1. Fund publicly</p>
                  <p className="mt-1 text-xs leading-6 text-spiceup-text-secondary">
                    Deposit to your live Starknet address using the public rail above.
                  </p>
                </div>
                <div className="rounded-[22px] border border-spiceup-border/80 bg-black/10 p-4">
                  <p className="text-sm font-medium text-white">2. Start using SpiceUP now</p>
                  <p className="mt-1 text-xs leading-6 text-spiceup-text-secondary">
                    You can already send publicly, receive publicly, and prepare group flows.
                  </p>
                </div>
                <div className="rounded-[22px] border border-spiceup-border/80 bg-black/10 p-4">
                  <p className="text-sm font-medium text-white">3. Upgrade into privacy later</p>
                  <p className="mt-1 text-xs leading-6 text-spiceup-text-secondary">
                    Once confidential execution is real, the app can guide users into it without guesswork.
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
