"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Chrome, Shield } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { setTempEmail, isValidEmail } from "@/lib/mockAuth";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEmailContinue = async () => {
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
    setLoading(true);

    // Simulate a brief network delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    await setTempEmail(trimmed);
    setLoading(false);
    router.push("/otp");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleEmailContinue();
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-7"
    >
      {/* Heading */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center gap-3 mb-3">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.05, type: "spring", stiffness: 400, damping: 20 }}
            className="w-12 h-12 rounded-xl bg-spiceup-accent/15 flex items-center justify-center"
          >
            <Shield size={22} className="text-spiceup-accent" />
          </motion.div>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight mb-1.5">
          Welcome to SpiceUP
        </h1>
        <p className="text-spiceup-text-secondary text-sm leading-relaxed">
          Sign in to manage your private payments on Starknet.
        </p>
      </motion.div>

      {/* Email Input */}
      <motion.div variants={itemVariants} className="space-y-3">
        <Input
          type="email"
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

        <Button
          variant="primary"
          size="lg"
          className="w-full shadow-lg shadow-spiceup-accent/20"
          onClick={handleEmailContinue}
          loading={loading}
          disabled={!email.trim()}
        >
          Continue with Email
        </Button>
      </motion.div>

      {/* Divider */}
      <motion.div variants={itemVariants} className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-spiceup-border to-transparent" />
        <span className="text-spiceup-text-muted text-xs uppercase tracking-wider font-medium">
          or
        </span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-spiceup-border to-transparent" />
      </motion.div>

      {/* Google OAuth (visual only) */}
      <motion.div variants={itemVariants}>
        <Button
          variant="secondary"
          size="lg"
          className="w-full gap-3"
          onClick={() => {
            // Visual only — not functional
          }}
        >
          <Chrome size={20} />
          Continue with Google
        </Button>
      </motion.div>

      {/* Privacy Note */}
      <motion.div variants={itemVariants}>
        <div className="bg-spiceup-surface/50 border border-spiceup-border rounded-xl p-4">
          <p className="text-spiceup-text-muted text-xs text-center leading-relaxed">
            🔒 By continuing, you agree to our{" "}
            <span className="text-spiceup-accent cursor-pointer hover:underline">Terms of Service</span>{" "}
            and{" "}
            <span className="text-spiceup-accent cursor-pointer hover:underline">Privacy Policy</span>.
            Your data is encrypted end-to-end.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
