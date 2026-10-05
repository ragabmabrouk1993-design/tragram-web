"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Home2Image from "./marketing-image";
import { defaultHome2Copy, type Home2Copy } from "../marketing-copy";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { PricingBillingToggle } from "@/components/marketing/pricing/pricing-billing-toggle";
import {
  PricingPlanCard,
  PricingPlanCardSkeleton,
  type PricingPlanBadge,
} from "@/components/marketing/pricing/pricing-plan-card";
import { PricingSharedFeatures } from "@/components/marketing/pricing/pricing-shared-features";
import { buildPricingFeaturePresentation, getPlanPricingFeatures } from "@/components/marketing/pricing/pricing-features";
import {
  getPlanPriceDetail,
  getPlanSummary,
  getSelectedPrice,
  resolveBillingPeriodFromView,
} from "@/components/marketing/pricing/pricing-utils";
import { localizePath, type Locale } from "@/lib/i18n";
import {
  paymentService,
  type BillingPeriod,
  type PricingPageModel,
} from "@/services/payment.service";
import { AppzenCta } from "@/components/ui/appzen-cta";
import { isBillingDisabledInCurrentEnv } from "@/lib/runtime-environment";

type Home2PricingProps = {
  copy?: Home2Copy;
  locale?: Locale;
};

export default function Home2Pricing({ copy, locale }: Home2PricingProps) {
  const resolvedCopy = copy ?? defaultHome2Copy;
  const resolvedLocale = locale ?? "en";
  const withLocale = (href: string) => localizePath(resolvedLocale, href);
  const routeMessages = useRouteMessages();
  const pricingMessages = routeMessages.pricingPage;
  const billingDisabled = isBillingDisabledInCurrentEnv();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod | null>(null);
  const [pricingModel, setPricingModel] = useState<PricingPageModel | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (billingDisabled) {
      return;
    }

    let isActive = true;

    paymentService
      .getPricingPage({ website: "main", locale: resolvedLocale })
      .then((response) => {
        if (!isActive) return;
        setPricingModel(response);
        setBillingPeriod((current) => current ?? resolveBillingPeriodFromView(response.defaultBillingView));
        setLoadState("ready");
      })
      .catch(() => {
        if (!isActive) return;
        setPricingModel(null);
        setLoadState("error");
      });

    return () => {
      isActive = false;
    };
  }, [billingDisabled, resolvedLocale]);

  const resolvedBillingPeriod = useMemo(
    () =>
      billingPeriod ??
      resolveBillingPeriodFromView(pricingModel?.defaultBillingView),
    [billingPeriod, pricingModel?.defaultBillingView]
  );

  const planCards = pricingModel?.plans ?? [];
  const featurePresentation = useMemo(() => buildPricingFeaturePresentation(planCards), [planCards]);
  const featureLabels = {
    limits: pricingMessages.limitsTitle,
    capabilities: pricingMessages.capabilitiesTitle,
    included: pricingMessages.includedValue,
    notIncluded: pricingMessages.excludedValue,
    notSpecified: pricingMessages.notSpecifiedValue,
    utcDay: pricingMessages.utcDayNote,
  };

  const buildPlanHref = (plan: PricingPageModel["plans"][number]) => {
    const selectedPrice = getSelectedPrice(plan, resolvedBillingPeriod);

    const params = new URLSearchParams({
      plan: plan.code,
      billingPeriod: resolvedBillingPeriod,
    });

    if (selectedPrice?.lookupKey) {
      params.set("lookupKey", selectedPrice.lookupKey);
    }

    return `${withLocale("/auth/signup")}?${params.toString()}`;
  };

  if (billingDisabled) {
    return null;
  }

  return (
    <section className="our-pricing-elite">
      <div className="container">
        <div className="row section-row">
          <div className="col-lg-12">
            <div className="section-title section-title-center">
              <h3 className="wow fadeInUp">{resolvedCopy.pricing.kicker}</h3>
              <h2 className="text-anime-style-3" data-cursor="-opaque">
                {resolvedCopy.pricing.title}
              </h2>
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <PricingBillingToggle
            billingPeriod={resolvedBillingPeriod}
            onChange={setBillingPeriod}
            monthlyLabel={resolvedCopy.pricing.tabMonthly}
            yearlyLabel={resolvedCopy.pricing.tabYearly}
            saveLabel={pricingMessages.saveLabel}
          />
        </div>

        <div className="mt-10 grid min-w-0 grid-cols-1 gap-6 md:auto-rows-fr md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {loadState === "loading"
            ? Array.from({ length: 3 }).map((_, index) => (
                <PricingPlanCardSkeleton key={`marketing-pricing-skeleton-${index}`} />
              ))
            : null}

          {loadState === "ready"
            ? planCards.map((plan) => {
                const price = getPlanPriceDetail(plan, resolvedBillingPeriod);
                const badges: PricingPlanBadge[] = [];

                if (plan.recommended) {
                  badges.push({
                    label: plan.recommendedBadge || pricingMessages.mostPopular,
                    tone: "accent",
                  });
                }

                return (
                  <PricingPlanCard
                    key={plan.code}
                    planCode={plan.code}
                    planName={plan.name}
                    summary={getPlanSummary(plan)}
                    badges={badges}
                    priceDisplay={price.display ?? "Unavailable"}
                    priceUnavailable={!price.display}
                    priceNote={price.note}
                    priceDetail={price.detail}
                    featureGroups={getPlanPricingFeatures(featurePresentation, plan)}
                    featureLabels={featureLabels}
                    recommended={plan.recommended}
                    footer={
                      <AppzenCta
                        href={buildPlanHref(plan)}
                        variant={plan.recommended ? "primary" : "secondary"}
                        className="w-full justify-center"
                      >
                        {plan.cta.label}
                      </AppzenCta>
                    }
                  />
                );
              })
            : null}
        </div>

        <PricingSharedFeatures
          title={pricingMessages.commonFeaturesTitle}
          features={featurePresentation.commonCapabilities}
        />
        {pricingModel ? (
          <div className="mt-5 text-center">
            <Link href={withLocale("/pricing")} className="text-sm font-semibold text-sky-200 underline-offset-4 hover:underline">
              {pricingMessages.viewComparison}
            </Link>
          </div>
        ) : null}

        {loadState === "error" ? (
          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-5 text-center text-sm text-white/72">
            {pricingMessages.loadingPlansError}
          </div>
        ) : null}

        {pricingModel?.showTaxDisclaimer && pricingModel.taxDisclaimer ? (
          <div className="mt-6 text-center text-sm text-white/54">
            <span className="font-medium text-white/72">
              {pricingMessages.taxDisclaimerLabel}:
            </span>{" "}
            {pricingModel.taxDisclaimer}
          </div>
        ) : null}

        <div className="pricing-benefit-list wow fadeInUp mt-10" data-wow-delay="0.2s">
          <ul>
            <li>
              <Home2Image src="/images/icon-pricing-benefit-1.svg" alt="" />
              {resolvedCopy.pricing.benefit1}
            </li>
            <li>
              <Home2Image src="/images/icon-pricing-benefit-2.svg" alt="" />
              {resolvedCopy.pricing.benefit2}
            </li>
            <li>
              <Home2Image src="/images/icon-pricing-benefit-3.svg" alt="" />
              {resolvedCopy.pricing.benefit3}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
