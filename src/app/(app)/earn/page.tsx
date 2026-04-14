"use client";

import { FeatureGateCard } from "@/components/FeatureGateCard";

export default function EarnPage() {
  return (
    <FeatureGateCard
      eyebrow="Launch Gate"
      title="Earn is not live in this release"
      description="Staking, DCA, and lending are still powered by simulated flows in this branch. They have been removed from the primary experience until the real integrations, risk disclosures, and transaction handling are connected."
      primaryHref="/home"
      primaryLabel="Back Home"
      secondaryHref="/groups"
      secondaryLabel="Open Groups"
    />
  );
}
