"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ChevronRight,
  Shield,
  Globe,
  Key,
  LogOut,
  ExternalLink,
  Wallet,
  ShieldCheck,
  Copy,
  Check,
  Eye,
  EyeOff,
  Network,
  Info,
  User,
  Smartphone,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { destroySession } from "@/lib/mockAuth";
import { storageGet } from "@/lib/storage";
import { AddressDisplay } from "@/components/AddressDisplay";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

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
  const router = useRouter();
  const reset = useAuthStore((s) => s.reset);
  const addToast = useToastStore((s) => s.addToast);

  const email = useAuthStore((s) => s.displayName);
  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const tongoRecipientId = useAuthStore((s) => s.tongoRecipientId);
  const phoneNumber = useAuthStore((s) => s.phoneNumber);
  const tongo = useAuthStore((s) => s.tongo) as {
    privateKey?: string;
  } | null;

  const [showKey, setShowKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const tongoKey = tongo?.privateKey || null;

  const handleExportKey = async () => {
    if (!showKey) {
      const stored = await storageGet("spiceup.tongo.privateKey");
      if (stored) {
        setShowKey(true);
        return;
      }
    }
    setShowKey(!showKey);
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
      // Clipboard API may not be available
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await new Promise((r) => setTimeout(r, 500));
    await destroySession();
    reset();
    addToast({
      type: "info",
      title: "Logged out",
      message: "See you next time!",
    });
    router.replace("/login");
  };

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-8">
      <motion.div variants={stagger} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={fadeUp} className="mb-8">
          <h1 className="text-white text-xl font-bold tracking-tight">
            Settings
          </h1>
          <p className="text-spiceup-text-secondary text-sm mt-1">
            Manage your account and preferences
          </p>
        </motion.div>

        {/* Account Section */}
        <motion.div variants={fadeUp} className="mb-6">
          <Card>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-spiceup-accent to-spiceup-accent/60 flex items-center justify-center shadow-lg shadow-spiceup-accent/15">
                <span className="text-base font-bold text-white">
                  {email?.charAt(0)?.toUpperCase() || "S"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-semibold truncate">
                  {email || "SpiceUP User"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {phoneNumber ? (
                    <div className="flex items-center gap-1 text-spiceup-text-muted text-xs">
                      <Smartphone size={11} />
                      {phoneNumber}
                    </div>
                  ) : (
                    <p className="text-spiceup-text-muted text-xs">
                      No phone number
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight
                size={16}
                className="text-spiceup-text-muted shrink-0"
              />
            </div>
          </Card>
        </motion.div>

        {/* Wallet & Identity Section */}
        <motion.div variants={fadeUp} className="mb-6">
          <h2 className="text-spiceup-text-muted text-xs uppercase tracking-wider font-medium mb-3 px-1">
            Wallet & Identity
          </h2>
          <div className="bg-spiceup-surface border border-spiceup-border rounded-xl overflow-hidden divide-y divide-spiceup-border">
            {/* Starknet Address */}
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-spiceup-accent/10 flex items-center justify-center shrink-0">
                <Wallet size={16} className="text-spiceup-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm">Starknet Wallet</p>
                {starknetAddress ? (
                  <p className="text-spiceup-text-muted text-xs font-mono truncate mt-0.5">
                    {starknetAddress}
                  </p>
                ) : (
                  <p className="text-spiceup-text-muted text-xs">
                    Not connected
                  </p>
                )}
              </div>
            </div>

            {/* Tongo Recipient ID */}
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-spiceup-success/10 flex items-center justify-center shrink-0">
                <ShieldCheck size={16} className="text-spiceup-success" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-sm">Tongo Recipient ID</p>
                  <PrivacyBadge label="ZK" size="sm" />
                </div>
                {tongoRecipientId ? (
                  <p className="text-spiceup-text-muted text-xs font-mono truncate mt-0.5">
                    {tongoRecipientId}
                  </p>
                ) : (
                  <p className="text-spiceup-text-muted text-xs">
                    Not initialized
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Network Section */}
        <motion.div variants={fadeUp} className="mb-6">
          <h2 className="text-spiceup-text-muted text-xs uppercase tracking-wider font-medium mb-3 px-1">
            Network
          </h2>
          <div className="bg-spiceup-surface border border-spiceup-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-spiceup-warning/10 flex items-center justify-center shrink-0">
                <Globe size={16} className="text-spiceup-warning" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">Starknet Network</p>
                <p className="text-spiceup-text-muted text-xs mt-0.5">
                  Sepolia Testnet
                </p>
              </div>
              <span className="text-xs font-semibold text-spiceup-warning bg-spiceup-warning/10 border border-spiceup-warning/20 px-2.5 py-1 rounded-full">
                Testnet
              </span>
            </div>
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div variants={fadeUp} className="mb-6">
          <h2 className="text-spiceup-text-muted text-xs uppercase tracking-wider font-medium mb-3 px-1">
            Security & Privacy
          </h2>
          <div className="bg-spiceup-surface border border-spiceup-border rounded-xl overflow-hidden divide-y divide-spiceup-border">
            {/* Export Tongo Key */}
            <button
              onClick={handleExportKey}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-spiceup-accent/10 flex items-center justify-center shrink-0 group-hover:bg-spiceup-accent/15 transition-colors">
                <Key
                  size={16}
                  className="text-spiceup-accent"
                />
              </div>
              <span className="text-white text-sm flex-1">
                Export Tongo Key
              </span>
              {showKey ? (
                <EyeOff
                  size={16}
                  className="text-spiceup-text-muted shrink-0"
                />
              ) : (
                <Eye size={16} className="text-spiceup-text-muted shrink-0" />
              )}
            </button>

            {/* Privacy Settings */}
            <button className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left group">
              <div className="w-9 h-9 rounded-lg bg-spiceup-accent/10 flex items-center justify-center shrink-0 group-hover:bg-spiceup-accent/15 transition-colors">
                <Shield
                  size={16}
                  className="text-spiceup-accent"
                />
              </div>
              <span className="text-white text-sm flex-1">
                Privacy Settings
              </span>
              <ChevronRight
                size={16}
                className="text-spiceup-text-muted shrink-0"
              />
            </button>
          </div>
        </motion.div>

        {/* Tongo Key Display */}
        {showKey && tongoKey && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <Card padding="sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-spiceup-warning text-[10px] uppercase tracking-wider mb-2 font-medium">
                    ⚠️ Private Key — Keep Secret
                  </p>
                  <p className="text-white text-xs font-mono break-all leading-relaxed bg-white/5 rounded-lg p-3">
                    {tongoKey}
                  </p>
                </div>
                <button
                  onClick={handleCopyKey}
                  className="shrink-0 mt-6 text-spiceup-text-muted hover:text-spiceup-accent transition-colors"
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

        {/* About Section */}
        <motion.div variants={fadeUp} className="mb-6">
          <h2 className="text-spiceup-text-muted text-xs uppercase tracking-wider font-medium mb-3 px-1">
            About
          </h2>
          <div className="bg-spiceup-surface border border-spiceup-border rounded-xl overflow-hidden divide-y divide-spiceup-border">
            <button className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left group">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                <ExternalLink
                  size={16}
                  className="text-spiceup-text-secondary"
                />
              </div>
              <span className="text-white text-sm flex-1">
                Terms of Service
              </span>
              <ChevronRight
                size={16}
                className="text-spiceup-text-muted shrink-0"
              />
            </button>
            <button className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left group">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0 group-hover:bg-white/10 transition-colors">
                <ExternalLink
                  size={16}
                  className="text-spiceup-text-secondary"
                />
              </div>
              <span className="text-white text-sm flex-1">
                Privacy Policy
              </span>
              <ChevronRight
                size={16}
                className="text-spiceup-text-muted shrink-0"
              />
            </button>
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                <Info size={16} className="text-spiceup-text-secondary" />
              </div>
              <span className="text-white text-sm flex-1">Version</span>
              <span className="text-spiceup-text-muted text-xs font-mono bg-white/5 px-2 py-0.5 rounded">
                v0.1.0
              </span>
            </div>
          </div>
        </motion.div>

        {/* Logout */}
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

        {/* Version Footer */}
        <motion.div variants={fadeUp}>
          <div className="text-center mt-8 space-y-1">
            <p className="text-spiceup-text-muted text-xs">
              SpiceUP v0.1.0 — Built on Starknet
            </p>
            <p className="text-spiceup-text-muted/50 text-[10px]">
              Privacy-first. No seed phrases required.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
