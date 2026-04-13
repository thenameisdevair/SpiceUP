"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Wallet, ShieldCheck, ArrowLeft } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth";
import { useToastStore } from "@/stores/toast";
import { Button } from "@/components/ui/Button";
import { PrivacyBadge } from "@/components/PrivacyBadge";
import { shortenAddress } from "@/lib/format";

type ReceiveMode = "public" | "private";

export default function ReceivePage() {
  const router = useRouter();
  const [mode, setMode] = useState<ReceiveMode>("public");
  const [copied, setCopied] = useState(false);

  const starknetAddress = useAuthStore((s) => s.starknetAddress);
  const tongoRecipientId = useAuthStore((s) => s.tongoRecipientId);
  const addToast = useToastStore((s) => s.addToast);

  const currentAddress =
    mode === "public" ? starknetAddress : tongoRecipientId;

  const handleCopy = useCallback(async () => {
    if (!currentAddress) return;
    try {
      await navigator.clipboard.writeText(currentAddress);
      setCopied(true);
      addToast({ type: "success", title: "Copied", message: `${mode === "public" ? "Address" : "Tongo ID"} copied to clipboard` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }, [currentAddress, mode, addToast]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-2xl mx-auto px-5 pt-5 pb-8"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/home")}
          className="text-spiceup-text-muted hover:text-white transition-colors p-1 -m-1"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-white text-lg font-bold tracking-tight">Receive</h1>
      </div>

      {/* Mode Toggle */}
      <div className="bg-spiceup-surface border border-spiceup-border rounded-xl p-1 mb-6 flex">
        {(["public", "private"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              mode === m
                ? m === "public"
                  ? "bg-white/10 text-white"
                  : "bg-spiceup-accent/20 text-spiceup-accent"
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

      {/* QR Code Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-6 flex flex-col items-center"
        >
          {/* Privacy indicator */}
          {mode === "private" && (
            <div className="mb-4">
              <PrivacyBadge label="Private" size="md" />
            </div>
          )}

          {/* QR Code */}
          <div className="bg-white rounded-2xl p-4 mb-5">
            <QRCodeSVG
              value={currentAddress || "0x0"}
              size={200}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#0D0D0D"
              includeMargin={false}
            />
          </div>

          {/* Label */}
          <p className="text-spiceup-text-secondary text-sm mb-1">
            {mode === "public" ? "Starknet Address" : "Tongo Recipient ID"}
          </p>

          {/* Address */}
          <p className="text-white font-mono text-sm mb-4">
            {currentAddress
              ? shortenAddress(currentAddress, 8)
              : "No address available"}
          </p>

          {/* Copy button */}
          <Button
            variant="secondary"
            onClick={handleCopy}
            disabled={!currentAddress}
            className="w-full gap-2"
          >
            {copied ? (
              <>
                <Check size={16} className="text-spiceup-success" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy {mode === "public" ? "Address" : "Tongo ID"}
              </>
            )}
          </Button>
        </motion.div>
      </AnimatePresence>

      {/* Info note */}
      <div className="mt-6 bg-spiceup-surface/50 border border-spiceup-border/50 rounded-xl p-4">
        <p className="text-spiceup-text-muted text-xs leading-relaxed">
          {mode === "public"
            ? "Share your Starknet address to receive public payments. Anyone with this address can send you tokens."
            : "Share your Tongo Recipient ID to receive confidential payments. Only you can view the amount and sender."}
        </p>
      </div>
    </motion.div>
  );
}
