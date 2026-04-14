"use client";

import { FeatureGateCard } from "@/components/FeatureGateCard";

export default function DcaCreatePage() {
  return (
    <FeatureGateCard
      eyebrow="Launch Gate"
      title="DCA is not live yet"
      description="Recurring buy orders are still backed by demo logic in this branch, so the creation flow has been disabled until the real execution path is ready."
      primaryHref="/home"
      primaryLabel="Back Home"
      secondaryHref="/groups"
      secondaryLabel="Open Groups"
    />
  );
}
