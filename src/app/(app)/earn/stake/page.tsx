"use client";

import { FeatureGateCard } from "@/components/FeatureGateCard";

export default function StakePage() {
  return (
    <FeatureGateCard
      eyebrow="Launch Gate"
      title="Staking is not live yet"
      description="This release removes simulated staking flows from the main product experience until validator data, balances, and real transactions are connected."
      primaryHref="/home"
      primaryLabel="Back Home"
      secondaryHref="/groups"
      secondaryLabel="Open Groups"
    />
  );
}
