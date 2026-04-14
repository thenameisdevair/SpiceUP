"use client";

import { FeatureGateCard } from "@/components/FeatureGateCard";

export default function LendDepositPage() {
  return (
    <FeatureGateCard
      eyebrow="Launch Gate"
      title="Lending deposits are not live yet"
      description="Deposit flows still depend on simulated market data and mock execution. They have been gated off until real lending integrations are ready."
      primaryHref="/home"
      primaryLabel="Back Home"
      secondaryHref="/groups"
      secondaryLabel="Open Groups"
    />
  );
}
