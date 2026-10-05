import type { PricingPagePlan } from "@/services/payment.service";

type Feature = PricingPagePlan["featureSummary"][number];

export type PricingFeatureRow = {
  code: string;
  label: string;
  value: Feature["value"];
  unit: string | null;
  included: boolean;
  specified: boolean;
  kind: "quota" | "capability";
  helperText?: string;
};

export type PlanPricingFeatures = {
  limits: PricingFeatureRow[];
  capabilities: PricingFeatureRow[];
};

export type PricingFeaturePresentation = {
  commonCapabilities: Array<Pick<Feature, "code" | "label">>;
  byPlan: Record<string, PlanPricingFeatures>;
};

const QUOTA_FEATURE_CODES = new Set([
  "mt_accounts",
  "telegram_channels",
  "max_active_orders_per_channel",
  "max_daily_trades_per_channel",
]);

const BOOLEAN_FEATURE_CODES = new Set([
  "mobile-app-access",
  "signal_copying",
  "analytics",
  "performance_reports",
  "execution_without_sl_tp",
]);

const isEnabled = (feature: Feature | undefined): boolean =>
  Boolean(feature && feature.included && feature.value === true);

const isDisabled = (feature: Feature | undefined): boolean =>
  Boolean(feature && feature.value === false && !feature.included);

const toRow = (
  feature: Feature | undefined,
  code: string,
  label: string,
  kind: PricingFeatureRow["kind"]
): PricingFeatureRow => {
  const specified = Boolean(
    feature &&
      (kind === "quota"
      ? (feature.included && (typeof feature.value === "number" || typeof feature.value === "string")) ||
        (!feature.included && feature.value === false)
        : feature.value === true || feature.value === false)
  );

  return {
    code,
    label,
    value: feature?.value ?? null,
    unit: feature?.unit ?? null,
    included: feature?.included === true,
    specified,
    kind,
    ...(code === "max_daily_trades_per_channel" ? { helperText: "utcDay" } : {}),
  };
};

export const buildPricingFeaturePresentation = (
  plans: PricingPagePlan[]
): PricingFeaturePresentation => {
  const featuresByCode = new Map<string, Feature>();
  for (const plan of plans) {
    for (const feature of plan.featureSummary) {
      if (!featuresByCode.has(feature.code)) featuresByCode.set(feature.code, feature);
    }
  }

  const quotaCodes = [...featuresByCode.keys()].filter((code) => QUOTA_FEATURE_CODES.has(code));
  const booleanCodes = [...featuresByCode.keys()].filter((code) => BOOLEAN_FEATURE_CODES.has(code));
  const commonCodes = new Set<string>();
  const varyingCodes = new Set<string>();

  if (plans.length > 1) {
    for (const code of booleanCodes) {
      const features = plans.map((plan) => plan.featureSummary.find((feature) => feature.code === code));
      if (features.every(isEnabled)) {
        commonCodes.add(code);
      } else if (!features.every(isDisabled)) {
        varyingCodes.add(code);
      }
    }
  } else {
    for (const code of booleanCodes) {
      const feature = plans[0]?.featureSummary.find((candidate) => candidate.code === code);
      if (feature && !isDisabled(feature)) varyingCodes.add(code);
    }
  }

  const byPlan = Object.fromEntries(
    plans.map((plan) => {
      const featureMap = new Map(plan.featureSummary.map((feature) => [feature.code, feature]));
      const key = plan.planVersionId || plan.code;
      return [
        key,
        {
          limits: quotaCodes.map((code) =>
            toRow(featureMap.get(code), code, featuresByCode.get(code)?.label ?? code, "quota")
          ),
          capabilities: [...varyingCodes].map((code) =>
            toRow(featureMap.get(code), code, featuresByCode.get(code)?.label ?? code, "capability")
          ),
        } satisfies PlanPricingFeatures,
      ];
    })
  );

  return {
    commonCapabilities: [...commonCodes].map((code) => ({
      code,
      label: featuresByCode.get(code)?.label ?? code,
    })),
    byPlan,
  };
};

export const getPlanPricingFeatures = (
  presentation: PricingFeaturePresentation,
  plan: PricingPagePlan
): PlanPricingFeatures =>
  presentation.byPlan[plan.planVersionId || plan.code] ?? { limits: [], capabilities: [] };
