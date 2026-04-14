"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Info,
  Key,
  LogOut,
  Shield,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react";
import { ENV } from "@/lib/env";
import { clearPendingAuthEmail, clearStoredPhoneNumber } from "@/lib/auth";
import { useAuthStore } from "@/stores/auth";
import { useGroupsStore } from "@/stores/groups";
import { useToastStore } from "@/stores/toast";
import { STORAGE_KEYS, storageDelete, storageGet } from "@/lib/storage";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

const stagger = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

export default function SettingsPage() {
  const { logout } = usePrivy();
  const router = useRouter();
  const reset = useAuthStore((s) => s.reset);
  const resetGroups = useGroupsStore((s) => s.resetData);
  const addToast = useToastStore((s) => s.addToast);

  const email = useAuthStore((s) => s.email);
  const displayName = useAuthStore((s) => s.displayName);
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const tongoRecipientId = useAuthStore((s) => s.tongoRecipientId);
  const phoneNumber = useAuthStore((s) => s.phoneNumber);
  const tongo = useAuthStore((s) => s.tongo) as {
    privateKey?: string;
  } | null;

  const [showKey, setShowKey] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(
    tongo?.privateKey ?? null
  );
  const [keyCopied, setKeyCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (tongo?.privateKey) {
      setRevealedKey(tongo.privateKey);
    }
  }, [tongo?.privateKey]);

  const tongoKey = revealedKey || tongo?.privateKey || null;

  const handleExportKey = async () => {
    if (showKey) {
      setShowKey(false);
      return;
    }

    if (tongoKey) {
      setShowKey(true);
      return;
    }

    const stored = await storageGet(STORAGE_KEYS.tongoPrivateKey);
    if (typeof stored === "string" && stored.trim()) {
      setRevealedKey(stored);
      setShowKey(true);
      return;
    }

    addToast({
      type: "info",
      title: "Key unavailable",
      message: "No exportable Tongo private key was found on this device.",
    });
  };

  const handleCopyKey = async () => {
    if (!tongoKey) return;

    try {
      await navigator.clipboard.writeText(tongoKey);
      setKeyCopied(true);
      addToast({
        type: "success",
        title: "Key copied",
        message: "Tongo private key copied to clipboard",
      });
      setTimeout(() => setKeyCopied(false), 2000);
    } catch {
      addToast({
        type: "error",
        title: "Copy failed",
        message: "Clipboard access was not available.",
      });
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);

    try {
      await logout();
      await Promise.all([
        clearPendingAuthEmail(),
        clearStoredPhoneNumber(),
        storageDelete(STORAGE_KEYS.tongoPrivateKey),
      ]);
      reset();
      resetGroups();
      addToast({
        type: "info",
        title: "Logged out",
        message: "See you next time!",
      });
      router.replace("/login");
    } catch (err) {
      console.error("Logout failed:", err);
      addToast({
        type: "error",
        title: "Couldn't log out",
        message: "Please try again.",
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const networkLabel = ENV.NETWORK === "mainnet" ? "Mainnet" : "Sepolia";
  const networkBadge = ENV.NETWORK === "mainnet" ? "Live" : "Testnet";
  const accountLabel = displayName || email || "SpiceUP User";
  const accountSubtext = email || "Authenticated with Privy";

  return (
    <div className="mx-auto max-w-3xl px-5 pt-5 pb-8">
      <motion.div variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="mb-6">
          <div className="rounded-[2rem] border border-spiceup-border bg-[radial-gradient(circle_at_top_right,color-mix(in_oklch,var(--color-spiceup-warning)_24%,transparent),transparent_38%),linear-gradient(145deg,color-mix(in_oklch,var(--color-spiceup-accent)_20%,var(--color-spiceup-surface)),var(--color-spiceup-surface))] p-6 shadow-[0_32px_80px_-48px_var(--color-spiceup-glow)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-[38rem]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spiceup-text-muted">
                  Settings
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight text-spiceup-text-primary">
                  Control the experience without losing the atmosphere.
                </h1>
                <p className="mt-3 max-w-[54ch] text-sm leading-7 text-spiceup-text-secondary">
                  Theme, identity, wallet state, and privacy details now live in
                  one place so the product feels deliberate instead of patched
                  together.
                </p>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-6">
          <Card className="rounded-[1.8rem] p-6">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.5rem] bg-spiceup-accent text-base font-bold text-[var(--primary-foreground)] shadow-[0_18px_40px_-24px_var(--color-spiceup-glow)]">
                {accountLabel.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-spiceup-text-primary">
                    {accountLabel}
                  </p>
                  <div className="rounded-full bg-spiceup-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-spiceup-accent">
                    Signed in
                  </div>
                </div>
                <p className="mt-1 truncate text-sm text-spiceup-text-secondary">
                  {accountSubtext}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="rounded-full border border-spiceup-border bg-spiceup-surface-strong px-3 py-1.5 text-xs text-spiceup-text-secondary">
                    {networkBadge} on {networkLabel}
                  </div>
                  {phoneNumber ? (
                    <div className="flex items-center gap-1.5 rounded-full border border-spiceup-border bg-spiceup-surface-strong px-3 py-1.5 text-xs text-spiceup-text-secondary">
                      <Smartphone size={12} />
                      {phoneNumber}
                    </div>
                  ) : (
                    <div className="rounded-full border border-spiceup-border bg-spiceup-surface-strong px-3 py-1.5 text-xs text-spiceup-text-secondary">
                      No phone on file yet
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-6 grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Theme ready",
              copy:
                "Dark mode leads by default, with light mode kept equally intentional.",
              icon: Sparkles,
            },
            {
              title: "Wallet state",
              copy: starknetAddress
                ? "A Starknet address is connected and visible below."
                : "No wallet address is connected yet.",
              icon: Wallet,
            },
            {
              title: "Privacy posture",
              copy: tongoRecipientId
                ? "Confidential identity is initialized for this account."
                : "Confidential identity still needs to be initialized.",
              icon: ShieldCheck,
            },
          ].map((item) => (
            <Card key={item.title} className="h-full rounded-[1.7rem] p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-spiceup-accent/12 text-spiceup-accent">
                <item.icon size={18} />
              </div>
              <p className="mt-4 text-sm font-semibold text-spiceup-text-primary">
                {item.title}
              </p>
              <p className="mt-2 text-sm leading-7 text-spiceup-text-secondary">
                {item.copy}
              </p>
            </Card>
          ))}
        </motion.div>

        <motion.div variants={fadeUp} className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-spiceup-text-muted">
            Wallet & Identity
          </h2>
          <div className="overflow-hidden rounded-[1.7rem] border border-spiceup-border bg-spiceup-surface">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-spiceup-accent/10 text-spiceup-accent">
                <Wallet size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-spiceup-text-primary">Starknet Wallet</p>
                {starknetAddress ? (
                  <p className="mt-0.5 truncate font-mono text-xs text-spiceup-text-muted">
                    {starknetAddress}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-spiceup-text-muted">
                    Not connected
                  </p>
                )}
              </div>
            </div>

            <div className="h-px bg-spiceup-border" />

            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-spiceup-success/10 text-spiceup-success">
                <ShieldCheck size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-spiceup-text-primary">
                    Tongo Recipient ID
                  </p>
                  <PrivacyBadge label="ZK" size="sm" />
                </div>
                {tongoRecipientId ? (
                  <p className="mt-0.5 truncate font-mono text-xs text-spiceup-text-muted">
                    {tongoRecipientId}
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-spiceup-text-muted">
                    Not initialized
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="mb-6 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="rounded-[1.7rem] p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-spiceup-warning/10 text-spiceup-warning">
                <Globe size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-spiceup-text-primary">
                  Network posture
                </p>
                <p className="text-xs text-spiceup-text-muted">
                  Current deployment context
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-spiceup-border bg-spiceup-surface-strong px-4 py-4">
              <div>
                <p className="text-sm font-medium text-spiceup-text-primary">
                  Starknet Network
                </p>
                <p className="mt-1 text-xs text-spiceup-text-secondary">
                  {networkLabel}
                </p>
              </div>
              <span className="rounded-full border border-spiceup-warning/30 bg-spiceup-warning/10 px-3 py-1.5 text-xs font-semibold text-spiceup-warning">
                {networkBadge}
              </span>
            </div>
          </Card>

          <Card className="rounded-[1.7rem] p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-spiceup-accent/10 text-spiceup-accent">
                <Shield size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-spiceup-text-primary">
                  Privacy controls
                </p>
                <p className="text-xs text-spiceup-text-muted">
                  Export only when needed
                </p>
              </div>
            </div>

            <button
              onClick={handleExportKey}
              className="flex w-full items-center gap-4 rounded-[1.4rem] border border-spiceup-border bg-spiceup-surface-strong px-4 py-4 text-left transition-colors hover:border-spiceup-accent/25"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-spiceup-accent/10 text-spiceup-accent">
                <Key size={16} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-spiceup-text-primary">
                  Export Tongo Key
                </p>
                <p className="mt-1 text-xs text-spiceup-text-secondary">
                  Reveal the private key only if you understand the security
                  risk.
                </p>
              </div>
              {!tongoKey ? (
                <span className="text-[11px] text-spiceup-text-muted">
                  Check
                </span>
              ) : showKey ? (
                <EyeOff size={16} className="shrink-0 text-spiceup-text-muted" />
              ) : (
                <Eye size={16} className="shrink-0 text-spiceup-text-muted" />
              )}
            </button>
          </Card>
        </motion.div>

        {showKey && tongoKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-6"
          >
            <Card className="rounded-[1.7rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spiceup-warning">
                    Private key. Keep secret.
                  </p>
                  <p className="mt-3 break-all rounded-[1.2rem] bg-spiceup-surface-strong p-3 font-mono text-xs leading-6 text-spiceup-text-primary">
                    {tongoKey}
                  </p>
                </div>
                <button
                  onClick={handleCopyKey}
                  className="mt-1 shrink-0 rounded-2xl border border-spiceup-border bg-spiceup-surface-strong p-2 text-spiceup-text-muted transition-colors hover:text-spiceup-accent"
                  aria-label="Copy private key"
                >
                  {keyCopied ? (
                    <Check size={16} className="text-spiceup-success" />
                  ) : (
                    <Copy size={16} />
                  )}
                </button>
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-spiceup-text-muted">
            About
          </h2>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Card className="rounded-[1.7rem] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-spiceup-surface-strong text-spiceup-text-secondary">
                  <Info size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-spiceup-text-primary">
                    Policy pages still need launch publishing
                  </p>
                  <p className="mt-2 text-sm leading-7 text-spiceup-text-secondary">
                    Terms of Service and Privacy Policy should be finalized and
                    linked before public launch. This screen now reflects that
                    honestly instead of pretending those routes already exist.
                  </p>
                </div>
              </div>
            </Card>

            <Card className="rounded-[1.7rem] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-spiceup-text-muted">
                Version
              </p>
              <p className="mt-3 font-mono text-sm text-spiceup-text-primary">
                v0.1.0
              </p>
              <p className="mt-2 text-xs leading-6 text-spiceup-text-secondary">
                Privacy-first on Starknet.
              </p>
            </Card>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Button
            variant="destructive"
            size="lg"
            className="w-full gap-3"
            onClick={handleLogout}
            loading={loggingOut}
          >
            <LogOut size={18} />
            Log out
          </Button>
        </motion.div>

        <motion.div variants={fadeUp}>
          <div className="mt-8 space-y-1 text-center">
            <p className="text-xs text-spiceup-text-muted">
              SpiceUP v0.1.0 — Built on Starknet
            </p>
            <p className="text-[10px] text-spiceup-text-muted/70">
              Privacy-first. No seed phrases required.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
