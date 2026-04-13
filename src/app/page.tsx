"use client";

import { motion } from "framer-motion";
import { Shield, Zap, Users, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-spiceup-bg flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center relative overflow-hidden">
        {/* Background gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-spiceup-accent/5 via-transparent to-transparent pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-spiceup-accent/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 max-w-lg mx-auto"
        >
          {/* Logo Mark */}
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: "easeOut" }}
            className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-gradient-to-br from-spiceup-accent to-spiceup-accent/60 flex items-center justify-center shadow-lg shadow-spiceup-accent/20"
          >
            <span className="text-white text-3xl font-bold">S</span>
          </motion.div>

          {/* Brand Name */}
          <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 tracking-tight">
            Spice<span className="text-spiceup-accent">UP</span>
          </h1>

          <p className="text-lg sm:text-xl text-spiceup-text-secondary mb-10 max-w-md mx-auto leading-relaxed">
            Private payments on Starknet. Send, split, and earn — without the
            world watching.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-spiceup-accent hover:bg-spiceup-accent-hover text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-spiceup-accent/25"
            >
              Get Started
              <ArrowRight size={20} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-spiceup-surface border border-spiceup-border hover:border-spiceup-accent/50 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
            >
              Learn More
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="px-6 pb-20">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: Shield,
              title: "Private by Default",
              description:
                "Amounts hidden on-chain with ZK proofs. Not even the blockchain knows how much you sent.",
              accent: "text-spiceup-accent",
              bg: "bg-spiceup-accent/10",
            },
            {
              icon: Zap,
              title: "Zero Gas Fees",
              description:
                "AVNU Propulsion covers all transaction costs. You never pay for gas.",
              accent: "text-spiceup-success",
              bg: "bg-spiceup-success/10",
            },
            {
              icon: Users,
              title: "Group Expenses",
              description:
                "Split bills, settle up privately, and manage shared expenses with friends.",
              accent: "text-spiceup-warning",
              bg: "bg-spiceup-warning/10",
            },
          ].map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.15, duration: 0.5 }}
              className="bg-spiceup-surface border border-spiceup-border rounded-2xl p-6 hover:border-spiceup-accent/30 transition-colors"
            >
              <div
                className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4`}
              >
                <feature.icon size={24} className={feature.accent} />
              </div>
              <h3 className="text-white font-semibold text-lg mb-2">
                {feature.title}
              </h3>
              <p className="text-spiceup-text-secondary text-sm leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-spiceup-border">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-spiceup-text-muted text-sm">
            &copy; {new Date().getFullYear()} SpiceUP. Built on Starknet.
          </p>
          <p className="text-spiceup-text-muted text-sm">
            Privacy-first. No seed phrases required.
          </p>
        </div>
      </footer>
    </div>
  );
}
