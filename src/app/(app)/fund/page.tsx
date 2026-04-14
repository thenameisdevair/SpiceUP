"use client";

import { FeatureGateCard } from "@/components/FeatureGateCard";

export default function FundPage() {
  return (
    <FeatureGateCard
      eyebrow="Launch Gate"
      title="Private funding is not live yet"
      description="Confidential funding still depends on mock Tongo execution in this branch. The route is being kept honest until private-balance contracts and wallet execution are connected."
      primaryHref="/home"
      primaryLabel="Back Home"
      secondaryHref="/receive"
      secondaryLabel="Open Receive"
    />
  );
}
