"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { updatePhoneNumber } from "@/lib/mockAuth";
import { useAuthStore } from "@/stores/auth";

export default function PhonePage() {
  const router = useRouter();
  const displayName = useAuthStore((s) => s.displayName);
  const setIdentity = useAuthStore((s) => s.setIdentity);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const formatPhone = (value: string) => {
    // Allow only digits, +, spaces, dashes, parens
    return value.replace(/[^\d+\s\-()]/g, "").slice(0, 20);
  };

  const handleContinue = async () => {
    const trimmed = phone.trim();
    if (trimmed && trimmed.length < 7) {
      setError("Please enter a valid phone number");
      return;
    }

    setError("");
    setLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 400));

    if (trimmed) {
      await updatePhoneNumber(trimmed);
      const state = useAuthStore.getState();
      setIdentity({
        privyUserId: state.privyUserId!,
        starknetAddress: state.starknetAddress!,
        tongoRecipientId: state.tongoRecipientId!,
        wallet: state.wallet,
        tongo: state.tongo,
        displayName: state.displayName,
        phoneNumber: trimmed,
      });
    }

    setLoading(false);
    router.push("/home");
  };

  const handleSkip = () => {
    router.push("/home");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-spiceup-text-secondary hover:text-white transition-colors"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </button>

      {/* Heading */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1 }}
          className="w-16 h-16 bg-spiceup-success/15 rounded-2xl flex items-center justify-center mx-auto mb-5"
        >
          <Phone size={28} className="text-spiceup-success" />
        </motion.div>
        <h1 className="text-white text-3xl font-bold mb-2">
          Add phone number
        </h1>
        <p className="text-spiceup-text-secondary text-sm">
          Optional — helps your friends find you.{" "}
          <span className="text-white">
            Welcome, {displayName || "there"}!
          </span>
        </p>
      </div>

      {/* Phone Input */}
      <div className="space-y-3">
        <Input
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={phone}
          onChange={(e) => {
            setPhone(formatPhone(e.target.value));
            if (error) setError("");
          }}
          error={error}
          icon={<Phone size={18} />}
          autoComplete="tel"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleContinue();
          }}
        />

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleContinue}
          loading={loading}
        >
          Continue
        </Button>
      </div>

      {/* Skip */}
      <div className="flex justify-center">
        <button
          onClick={handleSkip}
          className="flex items-center gap-2 text-spiceup-text-muted hover:text-white text-sm transition-colors"
        >
          <SkipForward size={16} />
          Skip for now
        </button>
      </div>

      {/* Info */}
      <div className="bg-spiceup-surface/50 border border-spiceup-border rounded-lg p-4">
        <p className="text-spiceup-text-muted text-xs text-center leading-relaxed">
          Your phone number is optional and only used for discoverability. You
          can add or change it later in Settings.
        </p>
      </div>
    </motion.div>
  );
}
