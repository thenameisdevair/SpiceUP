"use client";

import { useState } from "react";
import {
  useLoginWithEmail,
  useLoginWithOAuth,
  usePrivy,
} from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Chrome,
  Mail,
  Shield,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { setPendingAuthEmail } from "@/lib/auth";
import { useReadyGate } from "@/hooks/useReadyGate";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 },
  },
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginPage() {
  const router = useRouter();
  const { ready } = usePrivy();
  const { sendCode } = useLoginWithEmail();
  const { initOAuth } = useLoginWithOAuth();
  const waitForPrivyReady = useReadyGate(ready);
  const [email, setEmail] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailContinue = async () => {
    if (emailLoading) return;

    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      setError("Please enter your email address");
      return;
    }

    if (!isValidEmail(trimmed)) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    setEmailLoading(true);

    try {
      const privyReady = await waitForPrivyReady();
      if (!privyReady) {
        setError("Secure sign-in is still starting up. Please try again.");
        return;
      }

      await sendCode({ email: trimmed });
      await setPendingAuthEmail(trimmed);
      router.push("/otp");
    } catch (err) {
      console.error("Failed to start email login:", err);
      setError("We couldn't send your login code. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  const handleGoogleContinue = async () => {
    if (googleLoading) return;

    setError("");
    setGoogleLoading(true);

    try {
      const privyReady = await waitForPrivyReady();
      if (!privyReady) {
        setError("Secure sign-in is still starting up. Please try again.");
        return;
      }

      await initOAuth({ provider: "google" });
    } catch (err) {
      console.error("Google login failed:", err);
      setError("Google sign-in couldn't start. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEmailContinue();
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={itemVariants}>
        <div className="inline-flex items-center gap-2 rounded-full border border-spiceup-border bg-spiceup-surface px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-spiceup-text-muted">
          <Sparkles size={14} className="text-spiceup-accent" />
          Live-ready money movement
        </div>

        <div className="mt-5 space-y-3">
          <h1 className="max-w-[12ch] text-3xl font-bold tracking-tight text-spiceup-text-primary sm:text-[2.4rem] sm:leading-[1.02]">
            Move money with energy, not friction.
          </h1>
          <p className="max-w-[48ch] text-sm leading-7 text-spiceup-text-secondary">
            Sign in with email or Google to send support home, settle shared
            expenses, and step into a premium Starknet experience that feels
            magnetic without becoming confusing.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: Users,
              label: "Friend groups",
              copy:
                "Split rent, dinners, rides, and weekend chaos without spreadsheet energy.",
            },
            {
              icon: Wallet,
              label: "Diaspora remittance",
              copy:
                "Move support with more privacy, more clarity, and less cold fintech friction.",
            },
            {
              icon: Shield,
              label: "Trust first",
              copy:
                "Every step is framed clearly so people feel safe while money is moving.",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[1.5rem] border border-spiceup-border bg-spiceup-surface px-4 py-4"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-spiceup-accent/12 text-spiceup-accent">
                <item.icon size={18} />
              </div>
              <p className="text-sm font-semibold text-spiceup-text-primary">
                {item.label}
              </p>
              <p className="mt-1 text-xs leading-6 text-spiceup-text-secondary">
                {item.copy}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="space-y-4">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-spiceup-text-muted">
            Continue with email
          </p>
          <Input
            type="email"
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={handleKeyDown}
            error={error}
            icon={<Mail size={18} />}
            autoComplete="email"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Button
            variant="primary"
            size="lg"
            className="w-full justify-between"
            onClick={handleEmailContinue}
            loading={emailLoading}
            disabled={!email.trim()}
          >
            Continue with Email
            <ArrowRight size={18} />
          </Button>

          <Button
            variant="secondary"
            size="lg"
            className="w-full min-w-[220px] justify-center"
            onClick={handleGoogleContinue}
            loading={googleLoading}
          >
            <Chrome size={18} />
            Continue with Google
          </Button>
        </div>

        {!ready && (
          <p className="text-xs leading-6 text-spiceup-text-muted">
            Preparing secure sign-in...
          </p>
        )}

        <div className="grid gap-3 rounded-[1.6rem] border border-spiceup-border bg-spiceup-surface px-4 py-4 sm:grid-cols-3">
          {[
            "Fast sign-in with no seed phrase ceremony.",
            "Built for both recurring groups and urgent support transfers.",
            "Honest product states while deeper live rails are still being connected.",
          ].map((point) => (
            <p
              key={point}
              className="text-xs leading-6 text-spiceup-text-secondary"
            >
              {point}
            </p>
          ))}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <div className="rounded-[1.6rem] border border-spiceup-border bg-spiceup-surface px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-spiceup-text-primary">
            <Shield size={16} className="text-spiceup-accent" />
            Before you enter
          </div>
          <p className="mt-2 text-xs leading-6 text-spiceup-text-secondary">
            Authentication is live in this build. The rest of the product is
            being upgraded screen by screen so money movement feels exciting and
            trustworthy without relying on fake completion states.
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="border-t border-spiceup-border pt-4"
      >
        <p className="text-xs leading-6 text-spiceup-text-muted">
          By continuing, you agree to the SpiceUP legal and privacy notices once
          they are published for launch.
        </p>
      </motion.div>
    </motion.div>
  );
}
