"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useLoginWithEmail } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  clearPendingAuthEmail,
  getPendingAuthEmail,
  setPendingAuthEmail,
} from "@/lib/auth";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 25 } },
};

function isValidOtp(otp: string) {
  return /^\d{6}$/.test(otp);
}

export default function OTPPage() {
  const router = useRouter();
  const { sendCode, loginWithCode } = useLoginWithEmail();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load temp email on mount
  useEffect(() => {
    async function load() {
      const temp = await getPendingAuthEmail();
      if (!temp) {
        router.replace("/login");
        return;
      }
      setEmail(temp);
    }
    load();
  }, [router]);

  // Auto-focus first input
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) {
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      // Only accept digits
      const digit = value.replace(/\D/g, "").slice(-1);

      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      setError("");

      // Auto-advance to next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === "Backspace" && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);
      if (!pasted) return;

      const newOtp = [...otp];
      for (let i = 0; i < pasted.length; i++) {
        newOtp[i] = pasted[i];
      }
      setOtp(newOtp);

      // Focus the next empty or last input
      const nextEmpty = pasted.length < 6 ? pasted.length : 5;
      inputRefs.current[nextEmpty]?.focus();
    },
    [otp]
  );

  const handleResend = () => {
    if (!canResend || !email) return;

    void (async () => {
      try {
        await sendCode({ email });
        await setPendingAuthEmail(email);
        setCountdown(30);
        setCanResend(false);
        setOtp(["", "", "", "", "", ""]);
        setError("");
        inputRefs.current[0]?.focus();
      } catch (err) {
        console.error("Failed to resend email code:", err);
        setError("We couldn't resend the code. Please try again.");
      }
    })();
  };

  const otpString = otp.join("");
  const isComplete = otpString.length === 6;

  const handleVerify = async () => {
    if (!isValidOtp(otpString)) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await loginWithCode({ code: otpString });
      await clearPendingAuthEmail();
      router.push("/phone");
    } catch (err) {
      console.error("OTP verification failed:", err);
      setError("That code didn't work. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-7"
    >
      {/* Back button */}
      <motion.button
        variants={itemVariants}
        onClick={() => router.back()}
        className="flex items-center gap-2 text-spiceup-text-secondary hover:text-white transition-colors w-fit"
      >
        <ArrowLeft size={18} />
        <span className="text-sm">Back</span>
      </motion.button>

      {/* Heading */}
      <motion.div variants={itemVariants} className="text-center">
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 20 }}
          className="w-16 h-16 bg-spiceup-accent/15 rounded-2xl flex items-center justify-center mx-auto mb-5"
        >
          <ShieldCheck size={28} className="text-spiceup-accent" />
        </motion.div>
        <h1 className="text-white text-2xl font-bold tracking-tight mb-2">
          Verify your email
        </h1>
        <p className="text-spiceup-text-secondary text-sm">
          Enter the 6-digit code sent to
        </p>
        <div className="flex items-center justify-center gap-1.5 mt-1.5">
          <Mail size={14} className="text-spiceup-accent" />
          <span className="text-white font-medium text-sm">{email || "..."}</span>
        </div>
      </motion.div>

      {/* OTP Input */}
      <motion.div variants={itemVariants} className="flex justify-center gap-3">
        {otp.map((digit, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2 + index * 0.04 }}
          >
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className={`w-[50px] h-[60px] bg-spiceup-surface text-white text-xl font-bold text-center rounded-xl border-2 transition-all duration-200 outline-none ${
                digit
                  ? "border-spiceup-accent shadow-[0_0_0_3px_rgba(123,94,167,0.15)]"
                  : "border-spiceup-border hover:border-spiceup-text-muted focus:border-spiceup-accent focus:shadow-[0_0_0_3px_rgba(123,94,167,0.15)]"
              }`}
              aria-label={`Digit ${index + 1}`}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Error */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-red-400 text-sm text-center"
        >
          {error}
        </motion.p>
      )}

      {/* Verify Button */}
      <motion.div variants={itemVariants}>
        <Button
          variant="primary"
          size="lg"
          className={`w-full shadow-lg ${isComplete ? "shadow-spiceup-accent/20" : ""}`}
          onClick={handleVerify}
          loading={loading}
          disabled={otpString.length < 6}
        >
          Verify
        </Button>
      </motion.div>

      {/* Resend */}
      <motion.div variants={itemVariants} className="text-center">
        {canResend ? (
          <button
            onClick={handleResend}
            className="text-spiceup-accent hover:text-spiceup-accent-hover font-medium text-sm transition-colors"
          >
            Resend code
          </button>
        ) : (
          <p className="text-spiceup-text-muted text-sm">
            Resend code in{" "}
            <span className="text-white font-medium tabular-nums">{countdown}s</span>
          </p>
        )}
      </motion.div>

      {/* Mock hint */}
      <motion.div variants={itemVariants}>
        <div className="bg-spiceup-accent/5 border border-spiceup-accent/15 rounded-xl p-3.5">
          <p className="text-spiceup-text-muted text-xs text-center leading-relaxed">
            🔑 Demo mode: any 6-digit code will work
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
