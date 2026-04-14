"use client";

import { FeatureGateCard } from "@/components/FeatureGateCard";

export default function ClaimPage() {
  return (
    <FeatureGateCard
      eyebrow="Launch Gate"
      title="Reward claims are not live yet"
      description="Claim flows are still connected to simulated earn state. They have been paused until live reward reads and transaction execution are wired in."
      primaryHref="/home"
      primaryLabel="Back Home"
      secondaryHref="/groups"
      secondaryLabel="Open Groups"
    />
  );
}
