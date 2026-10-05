import type { ReactNode } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanPricingFeatures, PricingFeatureRow } from "./pricing-features";

type PricingPlanBadgeTone = "accent" | "neutral" | "muted";

export type PricingPlanBadge = {
  label: string;
  tone?: PricingPlanBadgeTone;
};

type PricingPlanCardProps = {
  id?: string;
  planCode: string;
  planName: string;
  summary?: string | null;
  badges?: PricingPlanBadge[];
  priceDisplay: string;
  priceUnavailable?: boolean;
  priceNote?: string | null;
  priceDetail?: string | null;
  featureGroups: PlanPricingFeatures;
  featureLabels: {
    limits: string;
    capabilities: string;
    included: string;
    notIncluded: string;
    notSpecified: string;
    utcDay: string;
  };
  footer: ReactNode;
  recommended?: boolean;
  current?: boolean;
  className?: string;
};

const badgeToneClasses: Record<PricingPlanBadgeTone, string> = {
  accent: "border border-sky-400/28 bg-sky-500/10 text-sky-100",
  neutral: "border border-white/12 bg-white/8 text-white/80",
  muted: "border border-white/10 bg-black/20 text-white/65",
};

const renderFeatureValue = (
  feature: PricingFeatureRow,
  labels: PricingPlanCardProps["featureLabels"]
) => {
  if (!feature.specified) {
    return <span className="text-sm text-white/50">{labels.notSpecified}</span>;
  }

  if (feature.kind === "quota") {
    if (!feature.included) {
      return <span className="text-sm text-white/55">{labels.notIncluded}</span>;
    }
    return (
      <span className="text-right text-base font-semibold tabular-nums text-white">
        {String(feature.value)}
      </span>
    );
  }

  const included = feature.included && feature.value === true;
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-medium", included ? "text-sky-100" : "text-white/55")}>
      {included ? <Check className="h-4 w-4" aria-hidden="true" /> : <Minus className="h-4 w-4" aria-hidden="true" />}
      {included ? labels.included : labels.notIncluded}
    </span>
  );
};

const FeatureRows = ({
  title,
  rows,
  labels,
}: {
  title: string;
  rows: PricingFeatureRow[];
  labels: PricingPlanCardProps["featureLabels"];
}) => {
  if (rows.length === 0) return null;

  return (
    <section className="!mt-3 first:!mt-0">
      <h4 className="!mb-0 !text-[13px] !leading-5 font-semibold !text-white/60">{title}</h4>
      <dl className="!mb-0 !mt-2 divide-y divide-white/[0.07]">
        {rows.map((feature) => (
          <div key={feature.code} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-2">
            <div>
              <dt className="text-[13px] leading-[18px] text-white/75">{feature.label}</dt>
              {feature.helperText === "utcDay" && (
                <dd className="!mb-0 mt-1 text-[11px] leading-4 text-white/45">{labels.utcDay}</dd>
              )}
            </div>
            <dd className="!mb-0 min-w-[4.25rem] text-end">{renderFeatureValue(feature, labels)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

export function PricingPlanCard({
  id,
  planCode,
  planName,
  summary,
  badges = [],
  priceDisplay,
  priceUnavailable = false,
  priceNote,
  priceDetail,
  featureGroups,
  featureLabels,
  footer,
  recommended = false,
  current = false,
  className,
}: PricingPlanCardProps) {
  return (
    <article
      id={id}
      className={cn(
        "flex h-full flex-col rounded-[22px] border !px-4 !py-4 text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition-colors duration-150",
        "bg-[var(--surface-elevated)] border-[var(--border-subtle)] w-full min-w-0 max-w-full",
        recommended && "border-primary/55 shadow-[0_12px_30px_rgba(15,107,255,0.12)]",
        current && "border-accent/35 bg-[color-mix(in_srgb,var(--surface-elevated)_92%,var(--color-accent))]",
        "md:!px-[18px] md:!py-[18px]",
        className
      )}
    >
      <div className="flex min-h-7 flex-wrap items-start gap-1.5">
          {badges.map((badge) => (
            <span
              key={`${planCode}-${badge.label}`}
              className={cn(
                "inline-flex min-h-6 items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide",
                badgeToneClasses[badge.tone ?? "neutral"]
              )}
            >
              {badge.label}
            </span>
          ))}
      </div>

      <div className="!mt-3 space-y-3">
        <div className="space-y-1.5">
          <h3 className="!mb-0 !text-xl !leading-6 font-semibold tracking-tight !text-white">
            {planName}
          </h3>
          {summary ? (
            <p className="!mb-0 max-w-[32ch] text-[13px] !leading-5 text-white/65">
              {summary}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 border-t border-white/[0.08] !pt-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className={cn(
                "!mb-0 tracking-tight",
                priceUnavailable
                  ? "text-[13px] font-medium !leading-5 text-white/55"
                  : "text-[1.75rem] font-semibold !leading-none text-white md:text-[2rem]"
              )}>
                {priceDisplay}
              </p>
              <div className="!mt-2 min-h-9">
                {priceNote ? (
                  <p className="!mb-0 max-w-[36ch] text-[12px] !leading-[18px] text-white/65">{priceNote}</p>
                ) : null}
              </div>
            </div>

            {priceDetail ? (
              <span className="inline-flex min-h-6 items-center rounded-full border border-emerald-400/20 bg-emerald-500/[0.08] px-2.5 py-1 text-[10px] font-semibold text-emerald-100">
                {priceDetail}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="!mt-3 flex flex-col md:flex-1">
        <FeatureRows title={featureLabels.limits} rows={featureGroups.limits} labels={featureLabels} />
        <FeatureRows title={featureLabels.capabilities} rows={featureGroups.capabilities} labels={featureLabels} />
      </div>

      <div className="!mt-3 border-t border-white/10 !pt-3">{footer}</div>
    </article>
  );
}

export function PricingPlanCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-[22px] border border-[var(--border-subtle)] bg-[var(--surface-elevated)] !px-4 !py-4 md:!px-[18px] md:!py-[18px]">
      <div className="flex items-start gap-2">
        <span className="h-6 w-20 animate-pulse rounded-full bg-white/10" />
      </div>
      <div className="!mt-3 space-y-2">
        <span className="block h-6 w-32 animate-pulse rounded-lg bg-white/10" />
        <span className="block h-3.5 w-full animate-pulse rounded bg-white/8" />
        <span className="block h-3.5 w-3/4 animate-pulse rounded bg-white/8" />
        <div className="border-t border-white/8 !pt-3">
          <span className="block h-8 w-28 animate-pulse rounded bg-white/10" />
          <span className="mt-2 block h-3 w-1/2 animate-pulse rounded bg-white/8" />
        </div>
      </div>
      <div className="!mt-3 flex flex-1 flex-col gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="h-4 w-4 animate-pulse rounded-full bg-white/10" />
            <span className="h-3.5 flex-1 animate-pulse rounded bg-white/8" />
          </div>
        ))}
      </div>
      <div className="!mt-3 border-t border-white/10 !pt-3">
        <span className="block h-10 w-full animate-pulse rounded-xl bg-white/10" />
      </div>
    </div>
  );
}
