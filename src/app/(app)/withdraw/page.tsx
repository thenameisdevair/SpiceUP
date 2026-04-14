"use client";

import { FeatureGateCard } from "@/components/FeatureGateCard";

export default function WithdrawPage() {
  return (
    <FeatureGateCard
      eyebrow="Launch Gate"
      title="Private withdrawals are not live yet"
      description="Confidential withdrawal flows still rely on simulated execution in this branch, so they stay gated until the private rail is real. If you want to move money out today, use the public send flow instead."
      primaryHref="/home"
      primaryLabel="Back Home"
      secondaryHref="/send"
      secondaryLabel="Open Public Send"
    />
  );
}
