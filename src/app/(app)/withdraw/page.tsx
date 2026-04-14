"use client";

import { FeatureGateCard } from "@/components/FeatureGateCard";

export default function WithdrawPage() {
  return (
    <FeatureGateCard
      eyebrow="Launch Gate"
      title="Private withdrawals are not live yet"
      description="Confidential withdrawal flows still rely on simulated execution in this branch, so they have been disabled until the real private transfer stack is connected."
      primaryHref="/home"
      primaryLabel="Back Home"
      secondaryHref="/receive"
      secondaryLabel="Open Receive"
    />
  );
}
