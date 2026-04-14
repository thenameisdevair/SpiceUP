"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface FeatureGateCardProps {
  eyebrow?: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function FeatureGateCard({
  eyebrow = "Set Live",
  title,
  description,
  primaryHref = "/home",
  primaryLabel = "Back Home",
  secondaryHref,
  secondaryLabel,
}: FeatureGateCardProps) {
  const router = useRouter();

  return (
    <div className="max-w-2xl mx-auto px-5 pt-5 pb-8 min-h-screen flex items-center">
      <div className="w-full bg-spiceup-surface border border-spiceup-border rounded-3xl p-8 shadow-xl shadow-black/10">
        <p className="text-spiceup-accent text-xs uppercase tracking-[0.24em] font-semibold mb-3">
          {eyebrow}
        </p>
        <h1 className="text-white text-3xl font-bold tracking-tight mb-3">
          {title}
        </h1>
        <p className="text-spiceup-text-secondary text-sm leading-relaxed max-w-[52ch]">
          {description}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => router.push(primaryHref)}
          >
            {primaryLabel}
          </Button>
          {secondaryHref && secondaryLabel ? (
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto"
              onClick={() => router.push(secondaryHref)}
            >
              {secondaryLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
