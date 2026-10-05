import type {
  BillingPeriod,
  PricingPagePlan,
} from "@/services/payment.service";

type PlanFeatureSummary = PricingPagePlan["featureSummary"][number];

export const resolveBillingPeriodFromView = (
  defaultBillingView?: "monthly" | "yearly" | null
): BillingPeriod => (defaultBillingView === "monthly" ? "MONTHLY" : "YEARLY");

export const getSelectedPrice = (
  plan: PricingPagePlan,
  billingPeriod: BillingPeriod
) =>
  billingPeriod === "YEARLY"
    ? plan.prices.yearly ?? null
    : plan.prices.monthly ?? null;

export const formatFeatureLabel = (
  feature: Pick<PlanFeatureSummary, "label" | "value" | "unit">
) => {
  if (feature.value === true || feature.value == null) {
    return feature.label;
  }

  return `${feature.value}${feature.unit ? ` ${feature.unit}` : ""} ${feature.label}`.trim();
};

export const getPlanHighlights = (plan: PricingPagePlan) => {
  const incrementalHighlights = (plan.incrementalHighlights ?? [])
    .map((highlight) => highlight.trim())
    .filter(Boolean);

  if (incrementalHighlights.length > 0) {
    return incrementalHighlights;
  }

  const explicitHighlights = plan.highlights
    .map((highlight) => highlight.trim())
    .filter(Boolean);

  if (explicitHighlights.length > 0) {
    return explicitHighlights;
  }

  return plan.featureSummary
    .filter((feature) => feature.included)
    .map((feature) => formatFeatureLabel(feature));
};

export const getPlanFeaturesTitle = (
  plan: PricingPagePlan,
  fallbackTitle: string,
  locale = 'en'
) =>
  plan.includedFromPlanName
    ? locale.startsWith('ar') ? `كل ميزات ${plan.includedFromPlanName}، بالإضافة إلى:` : `Everything in ${plan.includedFromPlanName}, and:`
    : fallbackTitle;

export const getPlanSummary = (plan: PricingPagePlan) =>
  plan.headline ?? plan.subheadline ?? null;

export const getAdvertisedWebTrialDays = (plan: PricingPagePlan): number | null => {
  const trialGrant = plan.trialGrant;
  return trialGrant?.enabled === true &&
    Number.isInteger(trialGrant.days) &&
    trialGrant.days > 0 &&
    trialGrant.salesChannels.includes('WEB')
    ? trialGrant.days
    : null;
};

export const getPlanPriceDetail = (
  plan: PricingPagePlan,
  billingPeriod: BillingPeriod
) => {
  const selectedPrice = getSelectedPrice(plan, billingPeriod);
  if (!selectedPrice) {
    return {
      display: null,
      note: null,
      detail: null,
    };
  }

  return {
    display: selectedPrice.display,
    note:
      billingPeriod === "YEARLY" && selectedPrice.equivalentMonthlyDisplay
        ? selectedPrice.equivalentMonthlyDisplay
        : null,
    detail:
      billingPeriod === "YEARLY" ? selectedPrice.savingsLabel ?? null : null,
  };
};

export const getComparisonValueLabel = (
  value: string | boolean | number | null | undefined
) => {
  if (value === true) return "included";
  if (value === false || value == null) return "excluded";
  return String(value);
};
