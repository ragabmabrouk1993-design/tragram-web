"use client";

import { useEffect, useMemo, useState } from "react";
import Home2Image from "../../marketing/components/marketing-image";
import Home2Faqs from "../../marketing/components/faqs";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { PricingBillingToggle } from "@/components/marketing/pricing/pricing-billing-toggle";
import { PricingComparisonTable } from "@/components/marketing/pricing/pricing-comparison-table";
import { PricingSharedFeatures } from "@/components/marketing/pricing/pricing-shared-features";
import { buildPricingFeaturePresentation, getPlanPricingFeatures } from "@/components/marketing/pricing/pricing-features";
import {
  PricingPlanCard,
  PricingPlanCardSkeleton,
  type PricingPlanBadge,
} from "@/components/marketing/pricing/pricing-plan-card";
import {
  getPlanPriceDetail,
  getAdvertisedWebTrialDays,
  getPlanSummary,
  getSelectedPrice,
  resolveBillingPeriodFromView,
} from "@/components/marketing/pricing/pricing-utils";
import { localizePath, type Dictionary, type Locale } from "@/lib/i18n";
import {
  paymentService,
  type BillingPeriod,
  type PricingPageModel,
} from "@/services/payment.service";
import { type Home2Copy } from "../../marketing/marketing-copy";
import { AppzenCta } from "@/components/ui/appzen-cta";
import { PublicPageHeader } from "@/components/marketing/public-page-header";
import { useAppSelector } from "@/store/hooks";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

type PricingContentProps = {
  locale: Locale;
  home2Copy: Home2Copy;
  legacyPages: Dictionary["legacyPages"];
};

const benefitImages = [
  "/images/benefits-item-image-1.png",
  "/images/benefits-item-image-2.png",
  "/images/benefits-item-image-3.png",
];

const pricingBenefitIcons = [
  "/images/icon-pricing-benefit-1.svg",
  "/images/icon-pricing-benefit-2.svg",
  "/images/icon-pricing-benefit-3.svg",
];

export default function PricingContent({
  locale,
  home2Copy,
  legacyPages,
}: PricingContentProps) {
  const withLocale = (href: string) => localizePath(locale, href);
  const routeMessages = useRouteMessages();
  const pricingMessages = routeMessages.pricingPage;
  const authStatus = useAppSelector((state) => state.auth.status);
  const accessToken = useAppSelector((state) => state.auth.accessToken);
  const isAuthenticated = authStatus === "authenticated" && Boolean(accessToken);
  const content = legacyPages.pricing;
  const shared = legacyPages.shared;
  const whyChoose = shared.whyChoose;
  const benefits = shared.benefits;
  const [pricingModel, setPricingModel] = useState<PricingPageModel | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    let isActive = true;

    paymentService
      .getPricingPage({ website: "main", locale })
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
  }, [locale]);

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

    if (!isAuthenticated && selectedPrice?.lookupKey) {
      params.set("lookupKey", selectedPrice.lookupKey);
    }

    const destination = isAuthenticated ? "/profile/subscription" : "/auth/signup";
    return `${withLocale(destination)}?${params.toString()}`;
  };

  return (
    <>
      <PublicPageHeader
        lang={locale}
        title={content.header.title}
        breadcrumbs={[
          { label: content.header.breadcrumbHome, href: withLocale("/") },
          { label: content.header.breadcrumbActive },
        ]}
      />

      <section className="page-pricing">
        <div className="container">
          <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(8,12,22,0.98),rgba(10,16,30,0.94))] !px-4 !py-5 shadow-[0_24px_80px_rgba(3,8,20,0.34)] md:!px-6 md:!py-6 lg:!px-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
              <div className="max-w-3xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-200/78">
                  {pricingMessages.kicker}
                </p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  {pricingMessages.title}
                </h2>
                <p className="mt-4 text-sm leading-7 text-white/68 md:text-base">
                  {pricingMessages.subtitle}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-5 py-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/45">
                  {pricingMessages.secureTitle}
                </p>
                <p className="mt-3 text-sm leading-6 text-white/72">
                  {pricingMessages.secureSubtitle}
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center lg:justify-start">
              <PricingBillingToggle
                billingPeriod={resolvedBillingPeriod}
                onChange={(value) => {
                  setBillingPeriod(value);
                  trackAnalyticsEvent("billing_cycle_changed", { billing_cycle: value });
                }}
                monthlyLabel={pricingMessages.monthly}
                yearlyLabel={pricingMessages.yearly}
                saveLabel={pricingMessages.saveLabel}
              />
            </div>

            {loadState === "error" ? (
              <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-5 text-center text-sm text-white/72">
                {pricingMessages.loadingPlansError}
              </div>
            ) : (
              <div className="mt-8 grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-6 md:auto-rows-fr">
                {loadState === "loading"
                  ? Array.from({ length: 3 }).map((_, index) => (
                      <PricingPlanCardSkeleton key={`public-pricing-skeleton-${index}`} />
                    ))
                  : planCards.map((plan) => {
                      const price = getPlanPriceDetail(plan, resolvedBillingPeriod);
                      const badges: PricingPlanBadge[] = [];

                      if (plan.recommended) {
                        badges.push({
                          label: plan.recommendedBadge || pricingMessages.mostPopular,
                          tone: "accent",
                        });
                      }

                      const trialDays = getAdvertisedWebTrialDays(plan);
                      if (trialDays) {
                        badges.push({
                          label: pricingMessages.trialBadge.replace('{days}', String(trialDays)),
                          tone: 'accent',
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
                          priceNote={[
                            price.note,
                            trialDays ? pricingMessages.trialEligibilityNote : null,
                          ].filter(Boolean).join(" • ") || null}
                          priceDetail={price.detail}
                          featureGroups={getPlanPricingFeatures(featurePresentation, plan)}
                          featureLabels={featureLabels}
                          recommended={plan.recommended}
                          footer={
                            <AppzenCta
                              href={buildPlanHref(plan)}
                              variant={plan.recommended ? "primary" : "secondary"}
                              className="w-full justify-center"
                              onClick={() => trackAnalyticsEvent("plan_selected", {
                                plan_code: plan.code,
                                billing_cycle: resolvedBillingPeriod,
                                is_recommended: plan.recommended,
                                has_trial_offer: Boolean(getAdvertisedWebTrialDays(plan)),
                              })}
                            >
                              {plan.cta.label}
                            </AppzenCta>
                          }
                        />
                      );
                    })}
              </div>
            )}

            <PricingSharedFeatures
              title={pricingMessages.commonFeaturesTitle}
              features={featurePresentation.commonCapabilities}
            />

            {pricingModel?.showTaxDisclaimer && pricingModel.taxDisclaimer ? (
              <div className="mt-6 text-sm text-white/56">
                <span className="font-medium text-white/72">
                  {pricingMessages.taxDisclaimerLabel}:
                </span>{" "}
                {pricingModel.taxDisclaimer}
              </div>
            ) : null}
          </div>

          {pricingModel ? (
            <PricingComparisonTable
              className="mt-8 md:mt-10"
              title={pricingMessages.compareTitle}
              subtitle={pricingMessages.compareSubtitle}
              featureLabel={pricingMessages.compareFeatureLabel}
              includedLabel={pricingMessages.includedValue}
              notIncludedLabel={pricingMessages.excludedValue}
              notSpecifiedLabel={pricingMessages.notSpecifiedValue}
              plans={pricingModel.plans}
              groups={pricingModel.comparison}
            />
          ) : null}

          <div className="pricing-benefit-list wow fadeInUp mt-10" data-wow-delay="0.4s">
            <ul>
              {content.benefits.map((benefit, index) => (
                <li key={benefit}>
                  <Home2Image
                    src={pricingBenefitIcons[index] ?? pricingBenefitIcons[0]}
                    alt=""
                  />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <div className="why-choose-us bg-section dark-section">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="why-choose-us-content">
                <div className="section-title">
                  <h3 className="wow fadeInUp">{whyChoose.kicker}</h3>
                  <h2 className="text-anime-style-3" data-cursor="-opaque">
                    {whyChoose.title}
                  </h2>
                </div>

                <div className="why-choose-us-btn wow fadeInUp" data-wow-delay="0.2s">
                  <AppzenCta href={withLocale("/contact")} variant="primary">
                    {whyChoose.cta}
                  </AppzenCta>
                </div>

                <div className="why-choose-us-image">
                  <figure>
                    <Home2Image src="/images/why-choose-us-image-v2.png" alt="" />
                  </figure>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="our-benefits bg-section">
        <div className="container">
          <div className="row section-row">
            <div className="col-lg-12">
              <div className="section-title section-title-center">
                <h3 className="wow fadeInUp">{benefits.kicker}</h3>
                <h2 className="text-anime-style-3" data-cursor="-opaque">
                  {benefits.title}
                </h2>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-12">
              <div className="benefits-item-list">
                {benefits.items.map((item, index) => (
                  <div
                    className="benefits-item wow fadeInUp"
                    data-wow-delay={index ? `${index * 0.2}s` : undefined}
                    key={item.title}
                  >
                    <div className="benefits-item-content">
                      <h3>{item.title}</h3>
                      <p>{item.body}</p>
                    </div>
                    <div className="benefits-item-image">
                      <figure>
                        <Home2Image src={benefitImages[index] ?? benefitImages[0]} alt="" />
                      </figure>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-lg-12">
              <div className="section-footer-text wow fadeInUp" data-wow-delay="0.2s">
                <p>{benefits.footerText}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Home2Faqs copy={home2Copy} locale={locale} />
    </>
  );
}
