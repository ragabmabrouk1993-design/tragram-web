import { Check } from "lucide-react";
import type { PricingFeaturePresentation } from "./pricing-features";

type PricingSharedFeaturesProps = {
  title: string;
  features: PricingFeaturePresentation["commonCapabilities"];
};

export function PricingSharedFeatures({ title, features }: PricingSharedFeaturesProps) {
  if (features.length === 0) return null;

  return (
    <section className="mt-7 rounded-2xl border border-sky-400/15 bg-sky-500/[0.045] px-5 py-5 md:px-6">
      <h3 className="!text-sky-100 text-sm font-semibold">{title}</h3>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <li key={feature.code} className="!text-white/80 flex items-start gap-3 text-sm leading-6">
            <Check className="mt-1 h-4 w-4 shrink-0 text-sky-300" aria-hidden="true" />
            <span>{feature.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
