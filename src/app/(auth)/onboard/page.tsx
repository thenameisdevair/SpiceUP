"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, Lock, Flame } from "lucide-react";
import { Button } from "@/components/ui/Button";

const slides = [
  {
    icon: Shield,
    title: "Privacy, without fake promises",
    body: "We are shaping confidential money movement carefully for launch instead of pretending every private rail is already live.",
    color: "text-spiceup-accent",
    bg: "bg-spiceup-accent/10",
    gradient: "from-spiceup-accent/15 via-spiceup-accent/5 to-transparent",
    glow: "bg-spiceup-accent/20",
  },
  {
    icon: Zap,
    title: "Gas sponsorship, staged properly",
    body: "AVNU-backed sponsorship is part of the live path, but it only appears when the full execution flow is wired and safe.",
    color: "text-spiceup-success",
    bg: "bg-spiceup-success/10",
    gradient: "from-spiceup-success/15 via-spiceup-success/5 to-transparent",
    glow: "bg-spiceup-success/20",
  },
  {
    icon: Lock,
    title: "Sign in with email",
    body: "No seed phrases, no browser extensions. After sign-in, we provision the account&apos;s Starknet receive address on the backend.",
    color: "text-spiceup-warning",
    bg: "bg-spiceup-warning/10",
    gradient: "from-spiceup-warning/15 via-spiceup-warning/5 to-transparent",
    glow: "bg-spiceup-warning/20",
  },
];

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 80 : -80,
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -80 : 80,
    opacity: 0,
    scale: 0.95,
  }),
};

export default function OnboardPage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);
  const slide = slides[current];
  const isLast = current === slides.length - 1;

  const goTo = (idx: number) => {
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const handleNext = () => {
    if (isLast) {
      router.push("/login");
    } else {
      setDirection(1);
      setCurrent(current + 1);
    }
  };

  const handleGetStarted = () => {
    router.push("/login");
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-spiceup-bg px-8">
      {/* Background gradient that changes per slide */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`bg-${current}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`absolute inset-0 bg-gradient-to-b ${slide.gradient} pointer-events-none`}
        />
      </AnimatePresence>

      {/* Decorative glow */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`glow-${current}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.6 }}
          className={`absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 ${slide.glow} rounded-full blur-3xl pointer-events-none`}
        />
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={current}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative z-10 text-center mb-12 max-w-sm mx-auto"
        >
          {/* Slide Icon */}
          <motion.div
            initial={{ scale: 0.8, rotate: -5 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 400, damping: 20 }}
            className={`w-24 h-24 ${slide.bg} rounded-3xl flex items-center justify-center mx-auto mb-10 relative`}
          >
            <slide.icon size={40} className={slide.color} />
            {/* Decorative ring */}
            <div className={`absolute inset-0 ${slide.bg} rounded-3xl animate-ping opacity-20`} />
          </motion.div>

          {/* Slide Number */}
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`${slide.color} text-xs font-semibold tracking-widest uppercase mb-4`}
          >
            {current === 0
              ? "Privacy Direction"
              : current === 1
                ? "Live Rollout"
                : "Easy Onboarding"}
          </motion.p>

          {/* Slide Content */}
          <motion.h2
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="text-white text-3xl font-bold mb-4 tracking-tight"
          >
            {slide.title}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-spiceup-text-secondary leading-relaxed text-[15px]"
          >
            {slide.body}
          </motion.p>
        </motion.div>
      </AnimatePresence>

      {/* Progress Dots */}
      <div className="relative z-10 flex items-center gap-3 mb-8">
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className="focus:outline-none"
            aria-label={`Go to slide ${i + 1}`}
          >
            <motion.div
              className="rounded-full"
              animate={{
                width: i === current ? 28 : 8,
                height: 8,
                backgroundColor:
                  i === current
                    ? "#7B5EA7"
                    : i < current
                      ? "#7B5EA780"
                      : "#333333",
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              whileHover={{ height: i === current ? 8 : 10 }}
            />
          </button>
        ))}
      </div>

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="relative z-10"
      >
        {isLast ? (
          <Button
            variant="primary"
            size="lg"
            onClick={handleGetStarted}
            className="px-14 gap-2 shadow-lg shadow-spiceup-accent/25"
          >
            <Flame size={18} />
            Get Started
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            onClick={handleNext}
            className="px-14 shadow-lg shadow-spiceup-accent/20"
          >
            Next
          </Button>
        )}
      </motion.div>

      {/* Skip */}
      {!isLast && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={handleGetStarted}
          className="relative z-10 mt-4 text-spiceup-text-muted hover:text-spiceup-text-secondary text-sm transition-colors"
        >
          Skip
        </motion.button>
      )}
    </div>
  );
}
