"use client";

import { FeatureGateCard } from "@/components/FeatureGateCard";

export default function LendWithdrawPage() {
  return (
    <FeatureGateCard
      eyebrow="Launch Gate"
      title="Lending withdrawals are not live yet"
      description="Withdrawal flows are still wired to simulated lending state in this branch. They have been disabled until live positions and transaction execution are connected."
      primaryHref="/home"
      primaryLabel="Back Home"
      secondaryHref="/groups"
      secondaryLabel="Open Groups"
    />
  );
}
