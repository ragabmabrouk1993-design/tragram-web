"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CreditCard, ExternalLink, Shield, Clock, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import {
    contextToUserSubscription,
    paymentService,
    BillingPeriod,
    PricingPagePlan,
    PricingPageModel,
    UserSubscription,
    BillingHistoryEntry,
    ConfirmoCheckout,
    formatInvoiceStatusLabel,
} from "@/services/payment.service";
import { useLocale } from "next-intl";
import { useRouteMessages } from "@/components/i18n/route-messages-provider";
import { formatCurrencyAmount } from "@/lib/currency-format";
import { getBillingMutationError } from "@/lib/billing-mutation-error";
import { PricingBillingToggle } from "@/components/marketing/pricing/pricing-billing-toggle";
import {
    PricingPlanCard,
    type PricingPlanBadge,
} from "@/components/marketing/pricing/pricing-plan-card";
import { PricingComparisonTable } from "@/components/marketing/pricing/pricing-comparison-table";
import { PricingSharedFeatures } from "@/components/marketing/pricing/pricing-shared-features";
import { buildPricingFeaturePresentation, getPlanPricingFeatures } from "@/components/marketing/pricing/pricing-features";
import { TrialActivationButton } from "@/components/subscription/trial-activation-button";
import {
    getPlanPriceDetail,
    getAdvertisedWebTrialDays,
    getPlanSummary,
    getSelectedPrice,
    resolveBillingPeriodFromView,
} from "@/components/marketing/pricing/pricing-utils";
import { ProfileShell } from "@/components/profile/profile-shell";
import { localizePath } from "@/lib/i18n";
import {
    isBillingDisabledInCurrentEnv,
} from "@/lib/runtime-environment";
import { hasActiveSubscriptionAccess } from "@/app/[lang]/channels/subscription-access";
import { canStartCheckout, canStartInternalWebTrial, getPendingConfirmoCheckoutId, getTrialRemainingParts, getTrialRemainingSeconds, normalizePublicPlanCode } from "@/services/subscription-view-model";
import { useTrialFingerprint } from "@/lib/trial-fingerprint";
import { settleBillingReads } from "@/lib/billing-read-results";
import { trackAnalyticsEvent } from "@/lib/analytics/client";

const statusClasses: Record<string, string> = {
    paid: "is-paid",
    active: "is-active",
    prepared: "is-prepared",
    confirming: "is-confirming",
    pending_verification: "is-pending-verification",
    expired: "is-expired",
    error: "is-error",
    cancelled: "is-cancelled",
};

const formatDate = (value?: string | Date | null, locale?: string) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString(locale);
};

const formatDateTime = (value?: string | Date | null, locale?: string) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZoneName: "short",
    }).format(date);
};

const toDateTimeValue = (value: string | Date) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
};

const SubscriptionSkeleton = () => (
    <div className="profile-form-stack profile-subscription profile-subscription-skeleton" aria-hidden="true">
        <div className="profile-card profile-subscription-header profile-subscription-skeleton-card">
            <div className="profile-subscription-heading profile-subscription-skeleton-heading">
                <span className="profile-skeleton-line profile-skeleton-line-short" />
                <span className="profile-skeleton-line profile-skeleton-line-wide" />
                <span className="profile-skeleton-line profile-skeleton-line-medium" />
            </div>
            <div className="profile-subscription-secure profile-subscription-skeleton-secure">
                <span className="profile-skeleton-circle profile-subscription-skeleton-icon" />
                <div className="profile-skeleton-content">
                    <span className="profile-skeleton-line profile-skeleton-line-short" />
                    <span className="profile-skeleton-line profile-skeleton-line-medium" />
                </div>
            </div>
        </div>

        <div className="profile-billing-toggle profile-subscription-skeleton-toggle">
            <span className="profile-subscription-skeleton-pill is-active" />
            <span className="profile-subscription-skeleton-pill" />
        </div>

        <div className="profile-plan-grid profile-subscription-skeleton-plans">
            {Array.from({ length: 2 }).map((_, index) => (
                <div key={`profile-subscription-plan-skeleton-${index}`} className="profile-card profile-subscription-skeleton-card profile-subscription-skeleton-plan">
                    <div className="profile-plan-badges">
                        <span className="profile-subscription-skeleton-badge" />
                    </div>
                    <div className="profile-plan-header profile-subscription-skeleton-plan-header">
                        <span className="profile-skeleton-line profile-skeleton-line-medium" />
                        <span className="profile-skeleton-line profile-skeleton-line-short" />
                        <span className="profile-skeleton-line profile-skeleton-line-wide" />
                        <span className="profile-skeleton-line profile-skeleton-line-short" />
                    </div>
                    <div className="profile-subscription-skeleton-features">
                        {Array.from({ length: 4 }).map((__, featureIndex) => (
                            <div
                                key={`profile-subscription-plan-feature-skeleton-${index}-${featureIndex}`}
                                className="profile-subscription-skeleton-feature-row"
                            >
                                <span className="profile-skeleton-circle" />
                                <span className="profile-skeleton-line" />
                            </div>
                        ))}
                    </div>
                    <span className="profile-subscription-skeleton-button" />
                </div>
            ))}
        </div>

        <div className="profile-subscription-grid">
            <div className="profile-card profile-subscription-panel profile-subscription-skeleton-card">
                <div className="profile-subscription-panel-header">
                    <div className="profile-skeleton-content">
                        <span className="profile-skeleton-line profile-skeleton-line-short" />
                        <span className="profile-skeleton-line profile-skeleton-line-medium" />
                    </div>
                    <span className="profile-skeleton-circle profile-subscription-skeleton-icon" />
                </div>
                <div className="profile-subscription-panel-body profile-subscription-skeleton-panel-body">
                    <span className="profile-skeleton-line profile-skeleton-line-medium" />
                    <div className="profile-subscription-skeleton-badges">
                        <span className="profile-subscription-skeleton-badge" />
                        <span className="profile-subscription-skeleton-badge profile-subscription-skeleton-badge-muted" />
                    </div>
                    <span className="profile-skeleton-line profile-skeleton-line-wide" />
                </div>
            </div>

            <div className="profile-card profile-subscription-panel profile-subscription-skeleton-card">
                <div className="profile-subscription-panel-header">
                    <div className="profile-skeleton-content">
                        <span className="profile-skeleton-line profile-skeleton-line-short" />
                        <span className="profile-skeleton-line profile-skeleton-line-medium" />
                    </div>
                    <span className="profile-skeleton-circle profile-subscription-skeleton-icon" />
                </div>
                <div className="profile-subscription-skeleton-invoices">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div
                            key={`profile-subscription-invoice-skeleton-${index}`}
                            className="profile-subscription-skeleton-invoice-row"
                        >
                            <div className="profile-skeleton-content">
                                <span className="profile-skeleton-line profile-skeleton-line-medium" />
                                <span className="profile-skeleton-line profile-skeleton-line-short" />
                            </div>
                            <span className="profile-subscription-skeleton-badge" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const SubscriptionPageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const lang = useLocale();
    const intlMessages = useRouteMessages();
    const billingDisabled = isBillingDisabledInCurrentEnv();
    const [plans, setPlans] = useState<PricingPagePlan[]>([]);
    const [pricingComparison, setPricingComparison] = useState<PricingPageModel["comparison"]>([]);
    const [subscription, setSubscription] = useState<UserSubscription | null>(null);
    const [currentPlan, setCurrentPlan] = useState<Awaited<ReturnType<typeof paymentService.getCurrentPlan>> | null>(null);
    const [trialSnapshotReceivedAt, setTrialSnapshotReceivedAt] = useState<number | null>(null);
    const [pendingCheckout, setPendingCheckout] = useState<ConfirmoCheckout | null>(null);
    const [invoices, setInvoices] = useState<BillingHistoryEntry[]>([]);
    const requestedBillingPeriod = searchParams.get('billingPeriod') === 'MONTHLY' ? 'MONTHLY' : searchParams.get('billingPeriod') === 'YEARLY' ? 'YEARLY' : null;
    const requestedPlan = normalizePublicPlanCode(searchParams.get('plan'));
    const requestedResubscribePlan = normalizePublicPlanCode(searchParams.get('resubscribePlan'));
    const [billingPeriod, setBillingPeriod] = useState<BillingPeriod | null>(requestedBillingPeriod);
    const [trialClock, setTrialClock] = useState(() => Date.now());
    const [isLoading, setIsLoading] = useState(true);
    const [loadErrors, setLoadErrors] = useState({ pricing: false, subscription: false, invoices: false });
    const [creatingPlanId, setCreatingPlanId] = useState<string | null>(null);
    const [isCancellationConfirmOpen, setIsCancellationConfirmOpen] = useState(false);
    const [isPendingCheckoutConfirmOpen, setIsPendingCheckoutConfirmOpen] = useState(false);
    const [pendingCheckoutTarget, setPendingCheckoutTarget] = useState<{ plan: PricingPagePlan; lookupKey: string } | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);
    const [isResumingCheckout, setIsResumingCheckout] = useState(false);
    const { collectTrialFingerprintEvent } = useTrialFingerprint();

    const hasPaidThroughCancellationAccess =
        subscription?.status === "CANCELLED" &&
        subscription.cancelAtPeriodEnd === true &&
        hasActiveSubscriptionAccess(subscription);
    const isSubscriptionActive = hasActiveSubscriptionAccess(subscription);
    const activeSubscription = isSubscriptionActive ? subscription : null;
    const activePlanSnapshot = currentPlan?.currentPlan?.entitlementActive ? currentPlan.currentPlan : null;
    const activeTrial = Boolean(activePlanSnapshot && currentPlan?.freeTrial.active);
    const activeTrialProvider = activePlanSnapshot?.provider
        ? activePlanSnapshot.provider === "GOOGLE_PLAY" ? "Google Play"
            : activePlanSnapshot.provider === "APP_STORE" ? "Apple App Store"
                : activePlanSnapshot.provider === "CONFIRMO" ? "Confirmo"
                    : "Stripe"
        : activePlanSnapshot?.origin === "SIGNUP_FREE_TRIAL"
            ? intlMessages.profilePages.subscription.signupTrialSource
            : null;
    const trialRemainingParts = activeTrial && currentPlan?.freeTrial.endsAt
        ? getTrialRemainingParts(getTrialRemainingSeconds(
            currentPlan.asOf,
            currentPlan.freeTrial.endsAt,
            currentPlan.freeTrial.remainingSeconds,
            trialSnapshotReceivedAt === null ? 0 : (trialClock - trialSnapshotReceivedAt) / 1000,
        ))
        : null;
    const previousSubscription = currentPlan?.previousSubscription ?? (
        currentPlan?.currentPlan?.lifecycleState === 'EXPIRED' && currentPlan.currentPlan.accessEndsAt
            ? {
                code: currentPlan.currentPlan.code,
                name: currentPlan.currentPlan.name,
                billingPeriod: currentPlan.currentPlan.billingPeriod,
                provider: currentPlan.currentPlan.provider,
                origin: currentPlan.currentPlan.origin ?? null,
                lifecycleState: 'EXPIRED' as const,
                accessEndedAt: currentPlan.currentPlan.accessEndsAt,
                wasTrial: Boolean(currentPlan.freeTrial.kind),
                managementUrl: currentPlan.currentPlan.managementUrl,
            }
            : null
    );
    const blocksPurchase = loadErrors.subscription || !canStartCheckout(currentPlan);
    const acquisitionBlockers = currentPlan?.acquisition.blockerCodes ?? [];
    const canResumePendingCheckout = Boolean(
        pendingCheckout?.checkoutUrl &&
        !acquisitionBlockers.some((code) => [
            "SUBSCRIPTION_BILLING_CONFLICT",
            "SUBSCRIPTION_PERIOD_ACTIVE",
            "SUBSCRIPTION_RECOVERY_PENDING",
            "SUBSCRIPTION_PAUSED",
            "PROVIDER_STATE_UNCONFIRMED",
        ].includes(code))
    );
    const currentPlanId = useMemo(
        () => normalizePublicPlanCode(activeSubscription?.planId || activeSubscription?.plan?.id || activePlanSnapshot?.code),
        [activePlanSnapshot?.code, activeSubscription]
    );
    const featurePresentation = useMemo(() => buildPricingFeaturePresentation(plans), [plans]);
    const featureLabels = {
        limits: intlMessages.pricingPage.limitsTitle,
        capabilities: intlMessages.pricingPage.capabilitiesTitle,
        included: intlMessages.pricingPage.includedValue,
        notIncluded: intlMessages.pricingPage.excludedValue,
        notSpecified: intlMessages.pricingPage.notSpecifiedValue,
        utcDay: intlMessages.pricingPage.utcDayNote,
    };
    const billingPeriodLabels: Record<BillingPeriod, string> = {
        MONTHLY: intlMessages.profilePages.subscription.monthly,
        YEARLY: intlMessages.profilePages.subscription.yearly,
    };
    const subscriptionBillingLabel = activeSubscription?.billingPeriod
        ? billingPeriodLabels[activeSubscription.billingPeriod] ?? activeSubscription.billingPeriod
        : null;
    const canCancelSubscription = Boolean(activeSubscription?.canCancel);
    const pendingConfirmoCheckoutId = pendingCheckout?.subscription?.id || getPendingConfirmoCheckoutId(currentPlan);
    const cancellationAccessEndsAt =
        activeSubscription?.accessEndsAt || activeSubscription?.currentPeriodEnd || null;

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [results, pendingCheckoutResult] = await Promise.all([
                settleBillingReads(
                    paymentService.getPricingPage({ website: "main", locale: lang }),
                    paymentService.getCurrentPlan(),
                    paymentService.listBillingHistory({ limit: 10 }),
                ),
                paymentService.getCurrentSubscriptionCheckout().then(
                    (checkout) => ({ status: "fulfilled" as const, value: checkout }),
                    (reason) => ({ status: "rejected" as const, reason }),
                ),
            ]);
            setPendingCheckout(pendingCheckoutResult.status === "fulfilled" ? pendingCheckoutResult.value : null);
            setLoadErrors({ pricing: results.pricing.status === 'rejected', subscription: results.subscription.status === 'rejected', invoices: results.invoices.status === 'rejected' });
            if (results.pricing.status === 'fulfilled') {
                const pricing = results.pricing.value;
                setPlans(pricing.plans || []);
                setPricingComparison(pricing.comparison || []);
                setBillingPeriod(current => current ?? resolveBillingPeriodFromView(pricing.defaultBillingView));
            }
            if (results.subscription.status === 'fulfilled') {
                setCurrentPlan(results.subscription.value);
                setTrialSnapshotReceivedAt(Date.now());
                setSubscription(contextToUserSubscription(results.subscription.value));
            } else {
                setCurrentPlan(null);
                setTrialSnapshotReceivedAt(null);
                setSubscription(null);
            }
            if (results.invoices.status === 'fulfilled') setInvoices(results.invoices.value.entries || []);
        } finally {
            setIsLoading(false);
        }
    }, [intlMessages, lang]);

    useEffect(() => {
        if (requestedBillingPeriod) setBillingPeriod(requestedBillingPeriod);
    }, [requestedBillingPeriod]);

    useEffect(() => {
        const targetPlan = requestedResubscribePlan ?? requestedPlan;
        if (!targetPlan || plans.length === 0) return;
        const matchingPlan = plans.find((plan) => normalizePublicPlanCode(plan.code) === targetPlan);
        if (!matchingPlan) return;
        const frame = window.requestAnimationFrame(() => {
            document.getElementById(`subscription-plan-${matchingPlan.code}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        return () => window.cancelAnimationFrame(frame);
    }, [plans, requestedPlan, requestedResubscribePlan]);

    const trialEndsAt = activeTrial ? currentPlan?.freeTrial.endsAt : null;
    useEffect(() => {
        if (!trialEndsAt) return;
        setTrialClock(Date.now());
        const deadline = new Date(trialEndsAt).getTime();
        const interval = window.setInterval(() => setTrialClock(Date.now()), 60_000);
        const refreshTimer = window.setTimeout(() => void loadData(), Math.max(1_000, deadline - Date.now() + 250));
        const refreshOnFocus = () => void loadData();
        window.addEventListener('focus', refreshOnFocus);
        return () => {
            window.clearInterval(interval);
            window.clearTimeout(refreshTimer);
            window.removeEventListener('focus', refreshOnFocus);
        };
    }, [loadData, trialEndsAt]);

    useEffect(() => {
	    if (billingDisabled) {
	      router.replace(localizePath(lang, "/profile"));
	      return;
	    }
	    const timeoutId = window.setTimeout(() => {
	      loadData();
	    }, 0);
	    return () => window.clearTimeout(timeoutId);
	  }, [billingDisabled, lang, loadData, router]);

    const resolvedBillingPeriod = useMemo(
        () => billingPeriod ?? "YEARLY",
        [billingPeriod]
    );

    const createCheckout = async (plan: PricingPagePlan, lookupKey: string) => {
        setCreatingPlanId(plan.code);
        trackAnalyticsEvent("purchase_started", {
            plan_code: plan.code,
            billing_cycle: resolvedBillingPeriod,
        });
        try {
            const result = await paymentService.createSubscriptionCheckout({ lookupKey });
            if (result.subscription) {
                setSubscription((current) => ({
                    ...(current ?? {
                        id: result.subscription!.id,
                        planId: plan.code,
                        status: result.subscription!.status,
                        billingPeriod: resolvedBillingPeriod,
                    }),
                    status: result.subscription!.status,
                    accessState: result.subscription!.accessState as UserSubscription["accessState"],
                    autoRenews: false,
                    canCancel: false,
                }));
            }
            if (result.checkoutUrl) {
                window.location.assign(result.checkoutUrl);
            } else {
                toast(intlMessages.billingFeedback.checkoutPending);
                await loadData();
            }
        } catch (error) {
            toast.error(
                getBillingMutationError(error, intlMessages,
                    intlMessages.profilePages.subscription.toastInvoiceError)
            );
        } finally {
            setCreatingPlanId(null);
        }
    };

    const handleCreateInvoice = async (
        plan: PricingPagePlan,
        lookupKey?: string | null
    ) => {
        if (!lookupKey) return;
        if (pendingConfirmoCheckoutId) {
            setPendingCheckoutTarget({ plan, lookupKey });
            setIsPendingCheckoutConfirmOpen(true);
            return;
        }
        await createCheckout(plan, lookupKey);
    };

    const handleConfirmPendingCheckout = async () => {
        if (!pendingConfirmoCheckoutId) return;
        setIsCancelling(true);
        try {
            await paymentService.cancelSubscription(pendingConfirmoCheckoutId);
            setPendingCheckout(null);
            setIsPendingCheckoutConfirmOpen(false);
            const target = pendingCheckoutTarget;
            setPendingCheckoutTarget(null);
            await loadData();
            if (target) {
                await createCheckout(target.plan, target.lookupKey);
            } else {
                toast.success(intlMessages.profilePages.subscription.pendingCheckoutCancelled);
            }
        } catch (error) {
            toast.error(
                getBillingMutationError(error, intlMessages,
                    intlMessages.profilePages.subscription.pendingCheckoutCancelError)
            );
        } finally {
            setIsCancelling(false);
        }
    };

    const handleResumePendingCheckout = async () => {
        if (!pendingConfirmoCheckoutId || !canResumePendingCheckout) return;
        setIsResumingCheckout(true);
        try {
            const checkout = await paymentService.getCurrentSubscriptionCheckout();
            if (!checkout?.checkoutUrl) {
                throw new Error('PENDING_CHECKOUT_URL_UNAVAILABLE');
            }
            window.location.assign(checkout.checkoutUrl);
        } catch (error) {
            toast.error(
                getBillingMutationError(error, intlMessages,
                    intlMessages.profilePages.subscription.pendingCheckoutResumeError)
            );
        } finally {
            setIsResumingCheckout(false);
        }
    };

    const handleStartTrial = async (plan: PricingPagePlan) => {
        if (!plan.trialGrant?.enabled || !currentPlan?.freeTrial.eligible) return;
        setCreatingPlanId(plan.code);
        try {
            const challenge = await paymentService.createTrialChallenge({
                plan_id: plan.code,
                plan_version_id: plan.planVersionId ?? undefined,
                sales_channel: "WEB",
            });
            const eventId = await collectTrialFingerprintEvent(challenge.nonce);
            const nextPlan = await paymentService.startTrial({
                plan_id: plan.code,
                plan_version_id: plan.planVersionId ?? undefined,
                sales_channel: "WEB",
                fingerprint_event_id: eventId,
                fingerprint_challenge_id: challenge.challenge_id,
            });
            setCurrentPlan(nextPlan);
            setSubscription(contextToUserSubscription(nextPlan));
            if (nextPlan.freeTrial.active) toast.success(intlMessages.billingFeedback.trialStarted);
            else toast(intlMessages.billingFeedback.trialPending);
        } catch (error) {
            toast.error(
                getBillingMutationError(error, intlMessages,
                    intlMessages.billingFeedback.trialError)
            );
        } finally {
            setCreatingPlanId(null);
        }
    };

    const handleCancelSubscription = async () => {
        if (!subscription || !canCancelSubscription) return;

        setIsCancelling(true);
        try {
            const result = await paymentService.cancelSubscription(subscription.id);
            setSubscription(result.subscription);
            setIsCancellationConfirmOpen(false);
            toast.success(
                intlMessages.profilePages.subscription.toastCancellationSuccess.replace(
                    "{date}",
                    formatDate(result.accessEndsAt, lang)
                )
            );
            await loadData();
        } catch (error) {
            toast.error(
                getBillingMutationError(error, intlMessages,
                    intlMessages.profilePages.subscription.toastCancellationError)
            );
        } finally {
            setIsCancelling(false);
        }
    };

    if (billingDisabled) {
        return null;
    }

    if (isLoading) {
        return (
            <ProfileShell
                title={intlMessages.profilePages.subscription.title}
                subtitle={intlMessages.profilePages.subscription.subtitle}
                backHref="/profile"
                variant="mobile"
            >
                <SubscriptionSkeleton />
            </ProfileShell>
        );
    }

    return (
        <ProfileShell
            title={intlMessages.profilePages.subscription.title}
            subtitle={intlMessages.profilePages.subscription.subtitle}
            backHref="/profile"
            variant="mobile"
        >
            <div className="profile-form-stack profile-subscription">
                <div className="profile-card profile-subscription-header">
                    <div className="profile-subscription-heading">
                        <p className="profile-panel-label">
                            {intlMessages.profilePages.subscription.kicker}
                        </p>
                        <h2 className="profile-subscription-title">
                            {intlMessages.profilePages.subscription.title}
                        </h2>
                        <p className="profile-subscription-subtitle">
                            {intlMessages.profilePages.subscription.subtitle}
                        </p>
                    </div>
                    <div className="profile-subscription-secure">
                        <Shield className="profile-icon" />
                        <div>
                            <p className="profile-subscription-secure-title">
                                {intlMessages.profilePages.subscription.secureTitle}
                            </p>
                            <p className="profile-subscription-secure-subtitle">
                                {intlMessages.profilePages.subscription.secureSubtitle}
                            </p>
                        </div>
                    </div>
                </div>

                {activeTrial && activePlanSnapshot && currentPlan?.freeTrial.endsAt && (
                    <div className="profile-card profile-subscription-panel" role="status" aria-live="polite">
                        <div className="profile-subscription-panel-header">
                            <div>
                                <p className="profile-panel-label">{intlMessages.profilePages.subscription.subscriptionSectionLabel}</p>
                                <h3 className="profile-subscription-panel-title">
                                    {intlMessages.profilePages.subscription.trialTitle.replace("{plan}", activePlanSnapshot.name || activePlanSnapshot.code || "")}
                                </h3>
                            </div>
                            <div className="profile-badge-row">
                                <span className="profile-badge is-active">{intlMessages.billingFeedback.subscriptionStates.TRIALING}</span>
                                {hasPaidThroughCancellationAccess && (
                                    <span className="profile-badge is-cancelled">{intlMessages.profilePages.subscription.cancelledBadge}</span>
                                )}
                            </div>
                        </div>
                        <div className="profile-subscription-panel-body">
                            {activeTrialProvider && (
                                <p className="profile-card-text">
                                    {activePlanSnapshot.provider
                                        ? intlMessages.profilePages.subscription.trialSource.replace("{provider}", activeTrialProvider)
                                        : activeTrialProvider}
                                </p>
                            )}
                            <div className="profile-subscription-date">
                                <Clock className="profile-icon" />
                                <span>
                                    <span className="profile-card-text">
                                        {intlMessages.billingFeedback.trialRemainingParts
                                            .replace("{days}", String(trialRemainingParts?.days ?? 0))
                                            .replace("{hours}", String(trialRemainingParts?.hours ?? 0))
                                            .replace("{minutes}", String(trialRemainingParts?.minutes ?? 0))}
                                    </span>
                                    <span className="profile-subscription-date-label">{intlMessages.profilePages.subscription.trialEndsAt}</span>{" "}
                                    <time dateTime={toDateTimeValue(currentPlan.freeTrial.endsAt)}>
                                        {formatDateTime(currentPlan.freeTrial.endsAt, lang)}
                                    </time>
                                </span>
                            </div>
                            {activePlanSnapshot.managementUrl && (
                                <a
                                    className="profile-subscription-manage-link"
                                    href={activePlanSnapshot.managementUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {intlMessages.profilePages.subscription.manageProviderBilling}
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            )}
                        </div>
                    </div>
                )}

                <div className="flex justify-center md:justify-start">
                    <PricingBillingToggle
                        billingPeriod={resolvedBillingPeriod}
                        onChange={(value) => {
                            setBillingPeriod(value);
                            trackAnalyticsEvent("billing_cycle_changed", { billing_cycle: value });
                        }}
                        monthlyLabel={intlMessages.profilePages.subscription.monthly}
                        yearlyLabel={intlMessages.profilePages.subscription.yearly}
                        saveLabel={intlMessages.profilePages.subscription.saveLabel}
                    />
                </div>

                {loadErrors.pricing && (
                    <div role="alert">
                        <p>{intlMessages.billingFeedback.pricingUnavailable}</p>
                        <Button variant="outline" onClick={() => void loadData()}>{intlMessages.billingFeedback.retry}</Button>
                    </div>
                )}
                {blocksPurchase && !loadErrors.subscription && acquisitionBlockers.length > 0 && (
                    <p className="profile-card-text" role="status">
                        {intlMessages.profilePages.subscription.acquisitionBlocked}
                    </p>
                )}
                <div className="profile-plan-grid">
                        {!loadErrors.pricing && plans.map((plan) => {
                            const normalizedPlanCode = normalizePublicPlanCode(plan.code);
                            const isCurrent = currentPlanId === normalizedPlanCode;
                            const isResubscribeTarget = requestedResubscribePlan === normalizedPlanCode;
                            const isRequestedPlan = requestedPlan === normalizedPlanCode;
                            const selectedPrice = getSelectedPrice(plan, resolvedBillingPeriod);
                            const priceInfo = getPlanPriceDetail(plan, resolvedBillingPeriod);
                            const yearlyBillingNote =
                                resolvedBillingPeriod === "YEARLY" && plan.prices.yearly
                                    ? intlMessages.profilePages.subscription.billedYearly.replace(
                                          "{amount}",
                                          plan.prices.yearly.display
                                      )
                                    : null;
                            const advertisedTrialDays = getAdvertisedWebTrialDays(plan);
                            const canStartTrial = Boolean(
                                !isSubscriptionActive &&
                                currentPlan?.freeTrial.eligible &&
                                advertisedTrialDays &&
                                canStartInternalWebTrial(currentPlan)
                            );
                            const priceNote = [
                                yearlyBillingNote,
                                priceInfo.note,
                                advertisedTrialDays && !canStartTrial
                                    ? intlMessages.profilePages.subscription.trialEligibilityNote
                                    : null,
                            ].filter(Boolean).join(" • ") || null;
                            const badges: PricingPlanBadge[] = [];

                            if (plan.recommended) {
                                badges.push({
                                    label:
                                        plan.recommendedBadge ||
                                        intlMessages.profilePages.subscription.mostPopular,
                                    tone: "accent",
                                });
                            }

                            if (isCurrent) {
                                badges.push({
                                    label: intlMessages.profilePages.subscription.currentPlanBadge,
                                    tone: "neutral",
                                });
                            }

                            if (advertisedTrialDays) {
                                badges.push({
                                    label: intlMessages.profilePages.subscription.trialBadge.replace(
                                        "{days}",
                                        String(advertisedTrialDays)
                                    ),
                                    tone: "accent",
                                });
                            }

                            return (
                                <PricingPlanCard
                                    key={plan.code}
                                    id={`subscription-plan-${plan.code}`}
                                    planCode={plan.code}
                                    planName={plan.name}
                                    summary={getPlanSummary(plan)}
                                    badges={badges}
                                    priceDisplay={
                                        priceInfo.display ??
                                        intlMessages.billingFeedback.priceUnavailable
                                    }
                                    priceUnavailable={!priceInfo.display}
                                    priceNote={priceNote}
                                    priceDetail={priceInfo.detail}
                                    featureGroups={getPlanPricingFeatures(featurePresentation, plan)}
                                    featureLabels={featureLabels}
                                    recommended={plan.recommended}
                                    current={isCurrent}
                                    className={isResubscribeTarget || isRequestedPlan ? "ring-inset ring-2 ring-cyan-300/80" : undefined}
                                    footer={
                                        canStartTrial ? (
                                            <div className="w-full space-y-2">
                                                <TrialActivationButton
                                                    variant={plan.recommended ? "gradient" : "outline"}
                                                    className="w-full"
                                                    disabled={loadErrors.subscription || creatingPlanId !== null}
                                                    loading={creatingPlanId === plan.code}
                                                    label={intlMessages.profilePages.subscription.trialBadge.replace(
                                                        "{days}",
                                                        String(advertisedTrialDays),
                                                    )}
                                                    loadingLabel={intlMessages.profilePages.subscription.buttonStartingTrial}
                                                    onActivate={() => handleStartTrial(plan)}
                                                />
                                                <p className="text-center text-xs leading-4 text-slate-400">
                                                    {intlMessages.profilePages.subscription.trialNoPaymentRequired}
                                                </p>
                                            </div>
                                        ) : (
                                            <Button
                                                variant={
                                                    isCurrent && blocksPurchase
                                                        ? "outline"
                                                        : plan.recommended
                                                          ? "gradient"
                                                          : "outline"
                                                }
                                                className="w-full"
                                                disabled={blocksPurchase || creatingPlanId !== null || !selectedPrice?.lookupKey}
                                                onClick={() => {
                                                    trackAnalyticsEvent("plan_selected", {
                                                        plan_code: plan.code,
                                                        billing_cycle: resolvedBillingPeriod,
                                                        is_recommended: plan.recommended,
                                                        has_trial_offer: Boolean(advertisedTrialDays),
                                                    });
                                                    const lookupKey =
                                                        selectedPrice?.lookupKey ?? plan.cta.lookupKey ?? null;
                                                    void handleCreateInvoice(plan, lookupKey);
                                                }}
                                            >
                                                {creatingPlanId === plan.code ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        {intlMessages.profilePages.subscription.buttonCreatingInvoice}
                                                    </span>
                                                ) : isCurrent && blocksPurchase ? (
                                                    intlMessages.profilePages.subscription.buttonCurrentPlan
                                                ) : !selectedPrice?.lookupKey ? (
                                                    intlMessages.billingFeedback.priceUnavailable
                                                ) : isResubscribeTarget ? (
                                                    intlMessages.profilePages.subscription.resubscribeToPlan.replace('{plan}', plan.name)
                                                ) : (
                                                    plan.cta.label ||
                                                    intlMessages.profilePages.subscription.buttonChoosePlan
                                                )}
                                            </Button>
                                        )
                                    }
                                />
                            );
                        })}
                </div>

                <PricingSharedFeatures
                    title={intlMessages.pricingPage.commonFeaturesTitle}
                    features={featurePresentation.commonCapabilities}
                />
                {pricingComparison.length > 0 && (
                    <details className="mt-7 rounded-2xl border border-white/10 bg-white/[0.02] px-5 py-4">
                        <summary className="cursor-pointer text-sm font-semibold text-sky-100 outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
                            {intlMessages.pricingPage.expandComparison}
                        </summary>
                        <PricingComparisonTable
                            className="mt-3"
                            title={intlMessages.pricingPage.compareTitle}
                            subtitle={intlMessages.pricingPage.compareSubtitle}
                            featureLabel={intlMessages.pricingPage.compareFeatureLabel}
                            includedLabel={intlMessages.pricingPage.includedValue}
                            notIncludedLabel={intlMessages.pricingPage.excludedValue}
                            notSpecifiedLabel={intlMessages.pricingPage.notSpecifiedValue}
                            plans={plans}
                            groups={pricingComparison}
                        />
                    </details>
                )}

                <div className="profile-subscription-grid">
                    <div className="profile-card profile-subscription-panel">
                        <div className="profile-subscription-panel-header">
                            <div>
                                <p className="profile-panel-label">
                                    {intlMessages.profilePages.subscription.subscriptionSectionLabel}
                                </p>
                                <h3 className="profile-subscription-panel-title">
                                    {intlMessages.profilePages.subscription.subscriptionSectionTitle}
                                </h3>
                            </div>
                            <CreditCard className="profile-icon" />
                        </div>

                        {loadErrors.subscription ? (
                            <div role="alert">
                                <p>{intlMessages.billingFeedback.subscriptionUnavailable}</p>
                                <Button variant="outline" onClick={() => void loadData()}>{intlMessages.billingFeedback.retry}</Button>
                            </div>
                        ) : subscription ? (
                            <div className="profile-subscription-panel-body">
                                <p className="profile-subscription-plan">
                                    {activePlanSnapshot?.name || subscription.plan?.name || plans.find(plan => normalizePublicPlanCode(plan.code) === normalizePublicPlanCode(subscription.planId))?.name || subscription.planId}
                                </p>
                                <div className="profile-badge-row">
                                    {hasPaidThroughCancellationAccess && (
                                        <span className="profile-badge is-cancelled">
                                            {intlMessages.profilePages.subscription.cancelledBadge}
                                        </span>
                                    )}
                                    {activeTrial && (
                                        <span className="profile-badge is-active">
                                            {intlMessages.billingFeedback.subscriptionStates.TRIALING}
                                        </span>
                                    )}
                                    {!hasPaidThroughCancellationAccess && !activeTrial && (
                                        <span className={`profile-badge ${isSubscriptionActive ? "is-active" : "is-muted"}`}>
                                            {Object.prototype.hasOwnProperty.call(intlMessages.billingFeedback.subscriptionStates, subscription.status.toUpperCase())
                                                ? (intlMessages.billingFeedback.subscriptionStates as Record<string, string>)[subscription.status.toUpperCase()]
                                                : intlMessages.billingFeedback.statusUnknown}
                                        </span>
                                    )}
                                    {subscriptionBillingLabel && (
                                        <span className="profile-badge is-muted">
                                            {subscriptionBillingLabel}
                                        </span>
                                    )}
                                </div>
                                {subscription.provider && !activeTrial && (
                                    <p className="profile-card-text">
                                        {intlMessages.profilePages.subscription.billedThrough.replace(
                                            "{provider}",
                                            subscription.provider === "GOOGLE_PLAY" ? "Google Play" :
                                                subscription.provider === "APP_STORE" ? "Apple App Store" :
                                                    subscription.provider === "CONFIRMO" ? "Confirmo" : subscription.provider
                                        )}
                                    </p>
                                )}
                                {!isSubscriptionActive && subscription.provider && (
                                    subscription.autoRenews ||
                                    ["ACTIVE", "PAST_DUE", "GRACE", "BILLING_RETRY", "ON_HOLD", "PAUSED"].includes(
                                        String(subscription.providerStatus ?? subscription.status).toUpperCase()
                                    )
                                ) && (
                                    <p className="profile-card-text" role="status">
                                        {intlMessages.profilePages.subscription.billingAccessReconciliation}
                                    </p>
                                )}
                                {subscription.managementUrl && !activeTrial && (
                                    <a
                                        className="profile-subscription-manage-link"
                                        href={subscription.managementUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {intlMessages.profilePages.subscription.manageProviderBilling}
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                )}
                                {!activeTrial && cancellationAccessEndsAt && <div className="profile-subscription-date">
                                    <Clock className="profile-icon" />
                                    <span>
                                        <span className="profile-subscription-date-label">{hasPaidThroughCancellationAccess
                                              ? intlMessages.profilePages.subscription.cancelledAccessUntil
                                            : intlMessages.profilePages.subscription.accessUntil}</span>{" "}
                                        <time dateTime={toDateTimeValue(cancellationAccessEndsAt)}>
                                            {formatDateTime(cancellationAccessEndsAt, lang)}
                                        </time>
                                    </span>
                                </div>}
                                {pendingConfirmoCheckoutId && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        className="profile-button profile-button-danger w-full"
                                        onClick={() => {
                                            setPendingCheckoutTarget(null);
                                            setIsPendingCheckoutConfirmOpen(true);
                                        }}
                                        disabled={isCancelling || creatingPlanId !== null}
                                    >
                                        {intlMessages.profilePages.subscription.cancelPendingCheckout}
                                    </Button>
                                )}
                                {canCancelSubscription && !hasPaidThroughCancellationAccess && (
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        className="profile-button profile-button-danger w-full"
                                        onClick={() => setIsCancellationConfirmOpen(true)}
                                        disabled={isCancelling}
                                    >
                                        {intlMessages.profilePages.subscription.cancelButton}
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <p className="profile-card-text">
                                {intlMessages.profilePages.subscription.noSubscription}
                            </p>
                        )}
                    </div>

                    {previousSubscription?.lifecycleState === 'EXPIRED' && (
                        <div className="profile-card profile-subscription-panel">
                            <div className="profile-subscription-panel-header">
                                <div>
                                    <p className="profile-panel-label">
                                        {intlMessages.profilePages.subscription.previousSubscriptionTitle}
                                    </p>
                                    <h3 className="profile-subscription-panel-title">
                                        {previousSubscription.name || previousSubscription.code || intlMessages.profilePages.subscription.subscriptionSectionTitle}
                                    </h3>
                                </div>
                                <CreditCard className="profile-icon" />
                            </div>
                            <div className="profile-subscription-panel-body">
                                <div className="profile-badge-row">
                                    <span className="profile-badge is-muted">{intlMessages.profilePages.subscription.previousExpiredBadge}</span>
                                    {previousSubscription.wasTrial && (
                                        <span className="profile-badge is-muted">{intlMessages.profilePages.subscription.previousTrialBadge}</span>
                                    )}
                                    {previousSubscription.billingPeriod && (
                                        <span className="profile-badge is-muted">{billingPeriodLabels[previousSubscription.billingPeriod]}</span>
                                    )}
                                </div>
                                {previousSubscription.provider && (
                                    <p className="profile-card-text">
                                        {intlMessages.profilePages.subscription.billedThrough.replace(
                                            '{provider}',
                                            previousSubscription.provider === 'GOOGLE_PLAY' ? 'Google Play' :
                                                previousSubscription.provider === 'APP_STORE' ? 'Apple App Store' :
                                                    previousSubscription.provider === 'CONFIRMO' ? 'Confirmo' : previousSubscription.provider
                                        )}
                                    </p>
                                )}
                                <div className="profile-subscription-date">
                                    <Clock className="profile-icon" />
                                    <span>
                                        <span className="profile-subscription-date-label">{intlMessages.profilePages.subscription.previousAccessEndedAt}</span>{" "}
                                        <time dateTime={toDateTimeValue(previousSubscription.accessEndedAt)}>
                                            {formatDateTime(previousSubscription.accessEndedAt, lang)}
                                        </time>
                                    </span>
                                </div>
                                {previousSubscription.managementUrl && ['APP_STORE', 'GOOGLE_PLAY'].includes(String(previousSubscription.provider)) ? (
                                    <a className="profile-subscription-manage-link" href={previousSubscription.managementUrl} target="_blank" rel="noopener noreferrer">
                                        {intlMessages.profilePages.subscription.manageProviderBilling}
                                        <ExternalLink className="h-4 w-4" />
                                    </a>
                                ) : previousSubscription.code && plans.some((plan) => normalizePublicPlanCode(plan.code) === normalizePublicPlanCode(previousSubscription.code)) ? (
                                    <Link
                                        className="dashboard-link-button"
                                        href={localizePath(lang, `/profile/subscription?resubscribePlan=${encodeURIComponent(normalizePublicPlanCode(previousSubscription.code) ?? '')}&billingPeriod=${previousSubscription.billingPeriod ?? 'YEARLY'}`)}
                                    >
                                        {intlMessages.profilePages.subscription.resubscribeToPlan.replace('{plan}', previousSubscription.name || previousSubscription.code)}
                                    </Link>
                                ) : (
                                    <p className="profile-card-text" role="status">{intlMessages.profilePages.subscription.resubscribeUnavailable}</p>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="profile-card profile-subscription-panel">
                        <div className="profile-subscription-panel-header">
                            <div>
                                <p className="profile-panel-label">
                                    {intlMessages.profilePages.subscription.invoicesLabel}
                                </p>
                                <h3 className="profile-subscription-panel-title">
                                    {intlMessages.profilePages.subscription.invoicesTitle}
                                </h3>
                            </div>
                            <Link
                                href={localizePath(lang, "/profile/invoices")}
                                aria-label={intlMessages.profilePages.subscription.invoicesTitle}
                            >
                                <ExternalLink className="profile-icon" />
                            </Link>
                        </div>

                        {loadErrors.invoices ? (
                            <div role="alert">
                                <p>{intlMessages.billingFeedback.invoicesUnavailable}</p>
                                <Button variant="outline" onClick={() => void loadData()}>{intlMessages.billingFeedback.retry}</Button>
                            </div>
                        ) : invoices.length === 0 ? (
                            <p className="profile-card-text">{intlMessages.profilePages.subscription.noInvoices}</p>
                        ) : (
                            <div className="profile-invoice-list">
                                {invoices.map((invoice) => {
                                    const badgeClass = statusClasses[invoice.status.toLowerCase()] ?? "is-muted";
                                    const amountLabel = invoice.amount == null
                                        ? intlMessages.profilePages.invoices.amountUnavailable
                                        : `${invoice.amount} ${invoice.amountCurrency ?? ""}`.trim();
                                    const providerLabel = invoice.provider === "APP_STORE"
                                        ? intlMessages.profilePages.invoices.providers.apple
                                        : invoice.provider === "GOOGLE_PLAY"
                                            ? intlMessages.profilePages.invoices.providers.google
                                            : intlMessages.profilePages.invoices.providers.confirmo;
                                    return (
                                        <div key={invoice.id} className="profile-invoice-item">
                                            <div>
                                                <p className="profile-invoice-title">
                                                    {invoice.productName || intlMessages.profilePages.subscription.invoiceFallback}
                                                </p>
                                                <p className="profile-invoice-meta">
                                                    {providerLabel}{invoice.environment === "SANDBOX" ? ` • ${intlMessages.profilePages.invoices.sandboxLabel}` : ""} • {amountLabel} • {formatDateTime(invoice.paidAt || invoice.occurredAt, lang)}
                                                </p>
                                            </div>
                                            <div className="profile-invoice-actions">
                                                <span className={`profile-badge ${badgeClass}`}>
                                                    {formatInvoiceStatusLabel(invoice.status, intlMessages.billingFeedback.invoiceStatuses)}
                                                </span>
                                                {invoice.document.providerInvoiceUrl && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="profile-button profile-button-outline"
                                                        onClick={() => window.open(invoice.document.providerInvoiceUrl!, "_blank", "noopener,noreferrer")}
                                                    >
                                                        {intlMessages.billingFeedback.viewPayment}
                                                        <ExternalLink className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {isCancellationConfirmOpen && subscription && (
                <div
                    className="profile-modal"
                    role="presentation"
                    onClick={() => {
                        if (!isCancelling) setIsCancellationConfirmOpen(false);
                    }}
                >
                    <div
                        className="profile-modal-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profile-subscription-cancellation-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <p
                            id="profile-subscription-cancellation-title"
                            className="profile-modal-title"
                        >
                            {intlMessages.profilePages.subscription.cancelTitle}
                        </p>
                        <p className="profile-modal-body">
                            {intlMessages.profilePages.subscription.cancelBody.replace(
                                "{date}",
                                formatDate(cancellationAccessEndsAt, lang)
                            )}
                        </p>
                        <div className="profile-modal-actions">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                disabled={isCancelling}
                                onClick={() => setIsCancellationConfirmOpen(false)}
                            >
                                {intlMessages.profilePages.subscription.cancelDismiss}
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                className="w-full"
                                disabled={isCancelling}
                                onClick={handleCancelSubscription}
                            >
                                {isCancelling ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {intlMessages.profilePages.subscription.cancelProcessing}
                                    </span>
                                ) : (
                                    intlMessages.profilePages.subscription.cancelConfirm
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
            {isPendingCheckoutConfirmOpen && pendingConfirmoCheckoutId && (
                <div
                    className="profile-modal"
                    role="presentation"
                    onClick={() => {
                        if (!isCancelling && !isResumingCheckout) {
                            setIsPendingCheckoutConfirmOpen(false);
                            setPendingCheckoutTarget(null);
                        }
                    }}
                >
                    <div
                        className="profile-modal-card"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="profile-pending-checkout-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <p id="profile-pending-checkout-title" className="profile-modal-title">
                            {intlMessages.profilePages.subscription.pendingCheckoutTitle}
                        </p>
                        <p className="profile-modal-body">
                            {intlMessages.profilePages.subscription.pendingCheckoutBody}
                        </p>
                        <div className="profile-modal-actions">
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                disabled={isCancelling || isResumingCheckout || !canResumePendingCheckout}
                                onClick={() => void handleResumePendingCheckout()}
                            >
                                {isResumingCheckout ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {intlMessages.profilePages.subscription.pendingCheckoutResumeProcessing}
                                    </span>
                                ) : (
                                    intlMessages.profilePages.subscription.pendingCheckoutResume
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="destructive"
                                className="w-full"
                                disabled={isCancelling || isResumingCheckout}
                                onClick={() => void handleConfirmPendingCheckout()}
                            >
                                {isCancelling ? (
                                    <span className="inline-flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        {intlMessages.profilePages.subscription.pendingCheckoutProcessing}
                                    </span>
                                ) : (
                                    pendingCheckoutTarget
                                        ? intlMessages.profilePages.subscription.pendingCheckoutContinue
                                        : intlMessages.profilePages.subscription.pendingCheckoutConfirm
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </ProfileShell>
    );
};

const SubscriptionPage = () => (
    <Suspense fallback={<SubscriptionSkeleton />}>
        <SubscriptionPageContent />
    </Suspense>
);

export default SubscriptionPage;
