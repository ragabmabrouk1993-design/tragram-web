import {
    getApiPaymentsInvoices,
    getApiPaymentsBillingHistory,
    getApiPaymentsBillingHistoryById,
    getApiPaymentsBillingHistoryByIdReceiptPdf,
    getApiPaymentsPricingPage,
    getApiPaymentsPlans,
    getApiPaymentsCurrentPlan,
    getApiPaymentsSubscriptionsCheckoutsByCheckoutIntentId,
    getApiPaymentsSubscriptionsCheckoutsCurrent,
    getApiPaymentsSubscriptionsBySubscriptionIdPayments,
    postApiPaymentsSubscriptionsCheckout,
    postApiPaymentsSubscriptionsBySubscriptionIdCancel,
    postApiPaymentsTrialChallenge,
    postApiPaymentsTrialSubscription,
    type InvoicesResponse,
    type PaymentContextResponse,
    type PaymentPlansResponse,
    type PaymentCurrentPlanResponse,
    type TrialChallengeRequest,
    type TrialFingerprintChallengeResponse,
    type TrialSubscriptionRequest,
} from "@/lib/api-client";
import { initApiClient } from "@/lib/api-client-setup";
import type { PaymentAccessOrigin } from "@tragram/types";

initApiClient();

export type BillingPeriod = "MONTHLY" | "YEARLY";

export interface SubscriptionFeatureRow {
    id: string;
    label: string;
    included: boolean;
}

export interface SubscriptionAccessPolicy {
    allowMobileAppAccess?: boolean;
    allowMtAccounts?: boolean;
    allowTelegramChannels?: boolean;
    allowSignalCopying?: boolean;
    allowAnalytics?: boolean;
    allowPerformanceReports?: boolean;
    allowExecutionWithoutSlTp?: boolean;
    maxMtAccounts?: number | null;
    maxTelegramChannels?: number | null;
    maxActiveOrdersPerChannel?: number | null;
    maxDailyTradesPerChannel?: number | null;
}

export interface SubscriptionPlan {
    id: string;
    name: string;
    description?: string | null;
    currency: string;
    priceMonthly: number | null;
    priceYearly: number | null;
    monthlyLookupKey?: string | null;
    yearlyLookupKey?: string | null;
    planVersionId?: string | null;
    features: string[];
    featureRows?: SubscriptionFeatureRow[];
    accessPolicy?: SubscriptionAccessPolicy | null;
    reportFrequencies?: string[];
    popular?: boolean;
    badge?: string;
    trialGrant?: {
        enabled: boolean;
        days: number;
        salesChannels: string[];
    };
}

export type PricingPagePrice = {
    id: string;
    lookupKey: string;
    provider: string;
    currency: string;
    billingInterval: "MONTHLY" | "YEARLY" | "ONE_TIME";
    amountMinor: number;
    display: string;
    equivalentMonthlyDisplay?: string | null;
    savingsLabel?: string | null;
};

export type PricingPagePlan = {
    code: string;
    planVersionId: string;
    name: string;
    headline?: string | null;
    subheadline?: string | null;
    recommended: boolean;
    recommendedBadge?: string | null;
    sortOrder: number;
    prices: {
        monthly?: PricingPagePrice;
        yearly?: PricingPagePrice;
    };
    cta: {
        type: "checkout" | "contact-sales" | "signup";
        label: string;
        lookupKey?: string | null;
    };
    highlights: string[];
    allHighlights?: string[];
    incrementalHighlights?: string[];
    includedFromPlanName?: string | null;
    featureSummary: Array<{
        code: string;
        label: string;
        value: string | boolean | number | null;
        included: boolean;
        category?: string | null;
        unit?: string | null;
    }>;
    trialGrant?: {
        enabled: boolean;
        days: number;
        salesChannels: string[];
    };
};

export type PricingPageModel = {
    website: string;
    locale: string;
    country: string | null;
    defaultBillingView: "monthly" | "yearly";
    currency: string;
    showTaxDisclaimer: boolean;
    taxDisclaimer?: string | null;
    plans: PricingPagePlan[];
    comparison: Array<{
        name: string;
        rows: Array<{
            code: string;
            label: string;
            values: Record<string, string | boolean | number | null>;
        }>;
    }>;
};

export interface PaymentInvoice {
    id: string;
    status: string;
    amount: number;
    currencyFrom: string;
    paymentUrl?: string | null;
    productName?: string | null;
    createdAt?: string;
}

export interface BillingHistoryEntry {
    id: string;
    provider: "CONFIRMO" | "APP_STORE" | "GOOGLE_PLAY";
    environment: string;
    status: string;
    resourceType: string;
    productName?: string | null;
    amount?: string | null;
    amountCurrency?: string | null;
    amountBasis?: string | null;
    paidAmount?: string | null;
    paidAsset?: string | null;
    refundedAmount?: string | null;
    refundedAsset?: string | null;
    occurredAt: string;
    paidAt?: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    providerReference?: string | null;
    document: {
        providerInvoiceUrl?: string | null;
        receiptAvailable: boolean;
        receiptKind?: "TRAGRAM_PAYMENT_RECEIPT" | null;
        receiptIssuer?: "TRAGRAM" | null;
        receiptNumber?: string | null;
        receiptDownloadPath?: string | null;
    };
}

export interface BillingHistoryCoverage {
    provider: string;
    status: "available" | "partial" | "unavailable";
    lastSyncedAt?: string | null;
    reason?: string | null;
}

export const formatInvoiceStatusLabel = (
    status?: string | null,
    labels: Record<string, string> = {
        paid: "Paid", active: "Active", prepared: "Awaiting payment",
        confirming: "Confirming payment", pending_verification: "Checking payment",
        pending: "Payment pending", expired: "Expired", error: "Payment needs attention",
        cancelled: "Cancelled", refunded: "Refunded", unknown: "Status unavailable",
    },
): string => {
    const key = status?.toLowerCase() ?? "unknown";
    return Object.prototype.hasOwnProperty.call(labels, key) ? labels[key] : labels.unknown;
};

export interface InvoicePagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

export interface UserSubscription {
    id: string;
    planId: string;
    plan?: SubscriptionPlan;
    status: string;
    billingPeriod: BillingPeriod;
    currentPeriodStart?: string;
    currentPeriodEnd?: string;
    cancelAtPeriodEnd?: boolean;
    cancelAt?: string | null;
    cancelledAt?: string | null;
    endedAt?: string | null;
    autoRenews?: boolean;
    accessEndsAt?: string | null;
    canCancel?: boolean;
    accessState?: "PENDING" | "ENTITLED" | "GRACE" | "ENDED";
    providerStatus?: string | null;
    nextPaymentAt?: string | null;
    origin?: PaymentAccessOrigin;
    provider?: string | null;
    managementUrl?: string | null;
}

export interface ConfirmoCheckout {
    checkoutIntentId: string;
    status: string;
    checkoutUrl: string | null;
    confirmationPending?: boolean;
    subscription: {
        id: string;
        status: string;
        accessState: "PENDING" | "ENTITLED" | "GRACE" | "ENDED" | string;
    } | null;
}

export interface SubscriptionPayment {
    id: string;
    cycleNumber: number;
    billedAmount: string;
    billedAsset: string;
    paidAmount: string;
    paidAsset: string;
    status: string;
    paidAt?: string | null;
    failureReason?: string | null;
    createdAt?: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined => {
    if (value instanceof Date) return value.toISOString();
    if (typeof value !== "string") return undefined;
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
};

const asNumber = (value: unknown): number | undefined => {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
};

const asPaymentAccessOrigin = (value: unknown): PaymentAccessOrigin | undefined => {
    const origins = new Set<Exclude<PaymentAccessOrigin, null>>([
        "SIGNUP_FREE_TRIAL", "ADMIN_GRANT", "FREE_BASIC", "APP_STORE", "GOOGLE_PLAY", "CONFIRMO", "STRIPE",
    ]);
    return typeof value === "string" && origins.has(value as Exclude<PaymentAccessOrigin, null>)
        ? value as PaymentAccessOrigin
        : undefined;
};

const asBoolean = (value: unknown): boolean | undefined =>
    typeof value === "boolean" ? value : undefined;

const asStringArray = (value: unknown): string[] =>
    Array.isArray(value)
        ? value
              .map((entry) => asString(entry))
              .filter((entry): entry is string => Boolean(entry))
        : [];

const asBillingPeriod = (value: unknown): BillingPeriod =>
    value === "YEARLY" ? "YEARLY" : "MONTHLY";

const toFeatureRows = (value: unknown): SubscriptionFeatureRow[] | undefined => {
    if (!Array.isArray(value)) return undefined;
    const rows = value
        .map((entry) => {
            if (!isRecord(entry)) return null;
            const id = asString(entry.id);
            const label = asString(entry.label);
            if (!id || !label) return null;
            return {
                id,
                label,
                included: Boolean(entry.included),
            };
        })
        .filter((entry): entry is SubscriptionFeatureRow => Boolean(entry));
    return rows.length > 0 ? rows : undefined;
};

const toAccessPolicy = (value: unknown): SubscriptionAccessPolicy | null | undefined => {
    if (value == null) return null;
    if (!isRecord(value)) return undefined;
    return {
        allowMtAccounts: asBoolean(value.allowMtAccounts),
        allowTelegramChannels: asBoolean(value.allowTelegramChannels),
        allowSignalCopying: asBoolean(value.allowSignalCopying),
        allowAnalytics: asBoolean(value.allowAnalytics),
        allowPerformanceReports: asBoolean(value.allowPerformanceReports),
        allowExecutionWithoutSlTp: asBoolean(value.allowExecutionWithoutSlTp),
        maxMtAccounts: asNumber(value.maxMtAccounts) ?? null,
        maxTelegramChannels: asNumber(value.maxTelegramChannels) ?? null,
        maxActiveOrdersPerChannel: asNumber(value.maxActiveOrdersPerChannel) ?? null,
        maxDailyTradesPerChannel: asNumber(value.maxDailyTradesPerChannel) ?? null,
    };
};

const toSubscriptionPlan = (value: unknown): SubscriptionPlan | null => {
    if (!isRecord(value)) return null;
    const id = asString(value.id);
    const name = asString(value.name);
    if (!id || !name) return null;

    const priceMonthly = asNumber(value.priceMonthly) ?? null;
    return {
        id,
        name,
        description: asString(value.description) ?? null,
        currency: asString(value.currency) ?? "USD",
        priceMonthly,
        priceYearly: asNumber(value.priceYearly) ?? null,
        monthlyLookupKey: asString(value.monthlyLookupKey) ?? null,
        yearlyLookupKey: asString(value.yearlyLookupKey) ?? null,
        planVersionId: asString(value.planVersionId) ?? null,
        features: asStringArray(value.features),
        featureRows: toFeatureRows(value.featureRows),
        accessPolicy: toAccessPolicy(value.accessPolicy),
        reportFrequencies: asStringArray(value.reportFrequencies),
        popular: asBoolean(value.popular),
        badge: asString(value.badge),
        trialGrant: isRecord(value.trialGrant)
            ? {
                enabled: asBoolean(value.trialGrant.enabled) ?? false,
                days: Math.max(0, Math.floor(asNumber(value.trialGrant.days) ?? 0)),
                salesChannels: asStringArray(value.trialGrant.salesChannels),
            }
            : undefined,
    };
};

const toUserSubscription = (value: unknown): UserSubscription | null => {
    if (!isRecord(value)) return null;
    const plan = toSubscriptionPlan(value.plan);
    const id = asString(value.id);
    const planId = asString(value.planId) ?? plan?.id;
    if (!id || !planId) return null;

    return {
        id,
        planId,
        plan: plan ?? undefined,
        status: asString(value.status) ?? "INACTIVE",
        billingPeriod: asBillingPeriod(value.billingPeriod),
        currentPeriodStart: asString(value.currentPeriodStart),
        currentPeriodEnd: asString(value.currentPeriodEnd),
        cancelAtPeriodEnd: asBoolean(value.cancelAtPeriodEnd) ?? false,
        cancelAt: asString(value.cancelAt) ?? null,
        cancelledAt: asString(value.cancelledAt) ?? asString(value.cancelAt) ?? null,
        endedAt: asString(value.endedAt) ?? null,
        autoRenews:
            asBoolean(value.autoRenews) ??
            (value.cancelAtPeriodEnd !== true &&
                ["ACTIVE", "PAST_DUE"].includes(String(value.status))),
        accessEndsAt: asString(value.accessEndsAt) ?? asString(value.currentPeriodEnd) ?? null,
        canCancel: asBoolean(value.canCancel),
        accessState: asString(value.accessState) as UserSubscription["accessState"],
        providerStatus: asString(value.providerStatus) ?? null,
        nextPaymentAt: asString(value.nextPaymentAt) ?? null,
    };
};

/**
 * Transitional view-model adapter for the legacy subscription page. The
 * network contract remains the canonical account context; this only reshapes
 * its access/billing fields for the page's existing presentation model.
 */
export const contextToUserSubscription = (value: unknown): UserSubscription | null => {
    if (!isRecord(value)) return null;
    const access = isRecord(value.access) ? value.access : {};
    const currentPlan = isRecord(value.currentPlan) ? value.currentPlan : {};
    const billing = isRecord(value.billing) ? value.billing : {};
    const providerSubscription = isRecord(billing.subscription) ? billing.subscription : null;
    const id = asString(currentPlan.subscriptionId) ?? asString(access.subscriptionId) ?? "context-access";
    const planCode = asString(currentPlan.code) ?? asString(access.planCode) ?? asString(providerSubscription?.planCode);
    if (!planCode) return null;
    const period = asBillingPeriod(currentPlan.billingPeriod ?? access.billingPeriod ?? providerSubscription?.period);
    const deadline = asString(currentPlan.accessEndsAt) ?? asString(currentPlan.currentPeriodEnd) ?? asString(access.deadline);
    return {
        id,
        planId: planCode === "max" ? "enterprise" : planCode,
        status: asString(currentPlan.status) ?? asString(providerSubscription?.state) ?? (asString(access.state) === "ENDED" ? "EXPIRED" : "ACTIVE"),
        billingPeriod: period,
        currentPeriodEnd: deadline ?? undefined,
        accessEndsAt: deadline,
        cancelAtPeriodEnd: asBoolean(currentPlan.cancelAtPeriodEnd) ?? false,
        autoRenews: asBoolean(currentPlan.autoRenews) ?? asBoolean(providerSubscription?.autoRenewing) ?? false,
        canCancel: false,
        accessState: (asString(currentPlan.accessState) ?? asString(access.state)) as UserSubscription["accessState"],
        providerStatus: asString(providerSubscription?.state) ?? asString(currentPlan.status) ?? null,
        origin: asPaymentAccessOrigin(currentPlan.origin ?? access.origin),
        provider: asString(currentPlan.provider) ?? asString(providerSubscription?.provider) ?? null,
        managementUrl: asString(currentPlan.managementUrl) ?? asString(providerSubscription?.managementUrl) ?? null,
    };
};

const normalizePricingPlan = (value: unknown): PricingPagePlan | null => {
    if (!isRecord(value)) return null;
    const code = asString(value.code);
    if (!code || !/^[a-z][a-z0-9_-]{0,63}$/.test(code)) return null;
    const rawPrices = isRecord(value.prices) ? value.prices : {};
    const toPrice = (raw: unknown, interval: "MONTHLY" | "YEARLY"): PricingPagePrice | undefined => {
        if (!isRecord(raw)) return undefined;
        const amountMinor = asNumber(raw.amountMinor);
        if (amountMinor === undefined || !Number.isSafeInteger(amountMinor) || amountMinor < 0) return undefined;
        const lookupKey = asString(raw.lookupKey);
        if (!lookupKey) return undefined;
        return {
            id: asString(raw.id) ?? `${code}:${interval.toLowerCase()}`,
            lookupKey,
            provider: asString(raw.provider) ?? "CONFIRMO",
            currency: asString(raw.currency) ?? "USD",
            billingInterval: interval,
            amountMinor,
            display: asString(raw.display) ?? "",
            equivalentMonthlyDisplay: asString(raw.equivalentMonthlyDisplay) ?? null,
            savingsLabel: asString(raw.savingsLabel) ?? null,
        };
    };
    const monthly = toPrice(rawPrices.monthly, "MONTHLY");
    const yearly = toPrice(rawPrices.yearly, "YEARLY");
    const rawCta = isRecord(value.cta) ? value.cta : {};
    const name = asString(value.name) ?? code.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    return {
        code,
        planVersionId: asString(value.planVersionId) ?? "",
        name,
        headline: asString(value.headline) ?? null,
        subheadline: asString(value.subheadline) ?? null,
        recommended: asBoolean(value.recommended) ?? false,
        recommendedBadge: asString(value.recommendedBadge) ?? null,
        sortOrder: asNumber(value.sortOrder) ?? 0,
        prices: { monthly, yearly },
        cta: {
            type: rawCta.type === "checkout" || rawCta.type === "contact-sales" ? rawCta.type : "signup",
            label: asString(rawCta.label) ?? "Choose plan",
            lookupKey: asString(rawCta.lookupKey) ?? monthly?.lookupKey ?? yearly?.lookupKey ?? null,
        },
        highlights: asStringArray(value.highlights),
        allHighlights: asStringArray(value.allHighlights),
        incrementalHighlights: asStringArray(value.incrementalHighlights),
        includedFromPlanName: asString(value.includedFromPlanName) ?? null,
        featureSummary: Array.isArray(value.featureSummary)
            ? value.featureSummary.filter(isRecord).map((row) => ({
                code: asString(row.code) ?? "",
                label: asString(row.label) ?? "",
                value: (typeof row.value === "boolean" || typeof row.value === "number" || typeof row.value === "string" || row.value === null)
                    ? row.value
                    : null,
                included: asBoolean(row.included) ?? false,
                category: asString(row.category) ?? null,
                unit: asString(row.unit) ?? null,
            }))
            : [],
        trialGrant: isRecord(value.trialGrant)
            ? {
                enabled: asBoolean(value.trialGrant.enabled) ?? false,
                days: Math.max(0, Math.floor(asNumber(value.trialGrant.days) ?? 0)),
                salesChannels: asStringArray(value.trialGrant.salesChannels),
            }
            : undefined,
    };
};

const toPaymentInvoice = (value: unknown): PaymentInvoice | null => {
    if (!isRecord(value)) return null;
    const id = asString(value.id);
    if (!id) return null;
    return {
        id,
        status: asString(value.status) ?? "UNKNOWN",
        amount: asNumber(value.amount) ?? 0,
        currencyFrom: asString(value.currencyFrom) ?? "USD",
        paymentUrl: asString(value.paymentUrl) ?? null,
        productName: asString(value.productName) ?? null,
        createdAt: asString(value.createdAt),
    };
};

const extractPaginatedItems = (payload: unknown): unknown[] => {
    if (!isRecord(payload)) return [];
    if (isRecord(payload.data) && Array.isArray(payload.data.items)) {
        return payload.data.items;
    }
    return [];
};

const extractPagination = (
    payload: unknown,
    fallback: { page: number; limit: number; itemCount: number }
): InvoicePagination | undefined => {
    const pagination =
        isRecord(payload) && isRecord(payload.data) && isRecord(payload.data.pagination)
            ? payload.data.pagination
            : null;
    if (!pagination) return undefined;
    const limit = asNumber(pagination.limit) ?? fallback.limit;
    const total = asNumber(pagination.total) ?? fallback.itemCount;
    return {
        page: asNumber(pagination.page) ?? fallback.page,
        limit,
        total,
        totalPages: asNumber(pagination.totalPages) ?? Math.ceil(total / limit),
        hasMore: asBoolean(pagination.hasMore) ?? total > fallback.page * limit,
    };
};

export const paymentService = {
    getPricingPage: async (params?: {
        website?: string;
        locale?: string;
        country?: string;
    }): Promise<PricingPageModel> => {
        const response = await getApiPaymentsPricingPage({
            query: params,
            throwOnError: true,
        });
        const payload = isRecord(response.data) ? response.data : {};
        return {
            website: asString(payload.website) ?? "main",
            locale: asString(payload.locale) ?? "en",
            country: asString(payload.country) ?? null,
            defaultBillingView: payload.defaultBillingView === "monthly" ? "monthly" : "yearly",
            currency: asString(payload.currency) ?? "USD",
            showTaxDisclaimer: Boolean(payload.showTaxDisclaimer),
            taxDisclaimer: asString(payload.taxDisclaimer) ?? null,
            plans: Array.isArray(payload.plans)
                ? payload.plans.map(normalizePricingPlan).filter((plan): plan is PricingPagePlan => Boolean(plan))
                : [],
            comparison: Array.isArray(payload.comparison) ? (payload.comparison as PricingPageModel["comparison"]) : [],
        };
    },

    getContext: async (params?: {
        platform?: "IOS" | "ANDROID";
        locale?: string;
        country?: string;
    }): Promise<PaymentContextResponse> => {
        const response = await getApiPaymentsCurrentPlan({
            query: params,
            throwOnError: true,
        });
        return { ...response.data, catalog: null };
    },

    getSubscriptionPlans: async (): Promise<PaymentPlansResponse> => {
        const response = await getApiPaymentsPlans({
            throwOnError: true,
        });
        return response.data;
    },

    getCurrentPlan: async (): Promise<PaymentCurrentPlanResponse> => {
        const response = await getApiPaymentsCurrentPlan({
            throwOnError: true,
        });
        return response.data;
    },

    createTrialChallenge: async (
        request: TrialChallengeRequest,
    ): Promise<TrialFingerprintChallengeResponse> => {
        const response = await postApiPaymentsTrialChallenge({
            body: request,
            throwOnError: true,
        });
        return response.data;
    },

    startTrial: async (
        request: TrialSubscriptionRequest,
    ): Promise<PaymentCurrentPlanResponse> => {
        const response = await postApiPaymentsTrialSubscription({
            body: request,
            throwOnError: true,
        });
        return response.data;
    },

    cancelSubscription: async (
        subscriptionId: string
    ): Promise<{
        subscription: UserSubscription | null;
        autoRenews: boolean;
        cancelledAt: string | null;
        accessEndsAt: string | null;
    }> => {
        const response = await postApiPaymentsSubscriptionsBySubscriptionIdCancel({
            path: { subscriptionId },
            throwOnError: true,
        });
        const payload = response.data;
        return {
            subscription: toUserSubscription(payload.subscription),
            autoRenews: payload.autoRenews,
            cancelledAt: payload.cancelledAt ? new Date(payload.cancelledAt).toISOString() : null,
            accessEndsAt: payload.accessEndsAt ? new Date(payload.accessEndsAt).toISOString() : null,
        };
    },

    createSubscriptionCheckout: async (data: {
        lookupKey: string;
        countryCode?: string;
        customerProfile?: Record<string, unknown>;
        idempotencyKey?: string;
    }): Promise<ConfirmoCheckout> => {
        const idempotencyKey = data.idempotencyKey ?? globalThis.crypto.randomUUID();
        const response = await postApiPaymentsSubscriptionsCheckout({
            body: {
                lookupKey: data.lookupKey,
                ...(data.countryCode ? { countryCode: data.countryCode } : {}),
                ...(data.customerProfile ? { customerProfile: data.customerProfile } : {}),
            },
            headers: { "Idempotency-Key": idempotencyKey },
            throwOnError: true,
        });
        const payload = response.data as unknown as Record<string, unknown>;
        const subscription = isRecord(payload.subscription)
            ? {
                  id: asString(payload.subscription.id) ?? "",
                  status: asString(payload.subscription.status) ?? "INCOMPLETE",
                  accessState: asString(payload.subscription.accessState) ?? "PENDING",
              }
            : null;
        return {
            checkoutIntentId: asString(payload.checkoutIntentId) ?? "",
            status: asString(payload.status) ?? "created",
            checkoutUrl: asString(payload.checkoutUrl) ?? null,
            confirmationPending: asBoolean(payload.confirmationPending),
            subscription,
        };
    },

    getSubscriptionCheckout: async (checkoutIntentId: string): Promise<ConfirmoCheckout> => {
        const response = await getApiPaymentsSubscriptionsCheckoutsByCheckoutIntentId({
            path: { checkoutIntentId },
            throwOnError: true,
        });
        const payload = response.data as unknown as Record<string, unknown>;
        const subscription = isRecord(payload.subscription)
            ? {
                  id: asString(payload.subscription.id) ?? "",
                  status: asString(payload.subscription.status) ?? "INCOMPLETE",
                  accessState: asString(payload.subscription.accessState) ?? "PENDING",
              }
            : null;
        return {
            checkoutIntentId: asString(payload.checkoutIntentId) ?? checkoutIntentId,
            status: asString(payload.status) ?? "created",
            checkoutUrl: asString(payload.checkoutUrl) ?? null,
            confirmationPending: asBoolean(payload.confirmationPending),
            subscription,
        };
    },

    getCurrentSubscriptionCheckout: async (): Promise<ConfirmoCheckout | null> => {
        let response: Awaited<ReturnType<typeof getApiPaymentsSubscriptionsCheckoutsCurrent>>;
        try {
            response = await getApiPaymentsSubscriptionsCheckoutsCurrent({
                throwOnError: true,
            });
        } catch (error) {
            if (isRecord(error) && isRecord(error.response) && error.response.status === 404) return null;
            throw error;
        }
        const payload = response.data as unknown as Record<string, unknown>;
        const subscription = isRecord(payload.subscription)
            ? {
                  id: asString(payload.subscription.id) ?? "",
                  status: asString(payload.subscription.status) ?? "INCOMPLETE",
                  accessState: asString(payload.subscription.accessState) ?? "PENDING",
              }
            : null;
        return {
            checkoutIntentId: asString(payload.checkoutIntentId) ?? "",
            status: asString(payload.status) ?? "created",
            checkoutUrl: asString(payload.checkoutUrl) ?? null,
            confirmationPending: asBoolean(payload.confirmationPending),
            subscription,
        };
    },

    listSubscriptionPayments: async (subscriptionId: string): Promise<SubscriptionPayment[]> => {
        const response = await getApiPaymentsSubscriptionsBySubscriptionIdPayments({
            path: { subscriptionId },
            throwOnError: true,
        });
        const payload = response.data as unknown as Record<string, unknown>;
        return Array.isArray(payload.payments)
            ? payload.payments.filter(isRecord).map((payment) => ({
                  id: asString(payment.id) ?? "",
                  cycleNumber: asNumber(payment.cycleNumber) ?? 0,
                  billedAmount: asString(payment.billedAmount) ?? "0",
                  billedAsset: asString(payment.billedAsset) ?? "USD",
                  paidAmount: asString(payment.paidAmount) ?? "0",
                  paidAsset: asString(payment.paidAsset) ?? "USD",
                  status: asString(payment.status) ?? "UNKNOWN",
                  paidAt: asString(payment.paidAt) ?? null,
                  failureReason: asString(payment.failureReason) ?? null,
                  createdAt: asString(payment.createdAt) ?? null,
              }))
            : [];
    },

    listInvoices: async (params?: {
        limit?: number;
        page?: number;
    }): Promise<{ invoices: PaymentInvoice[]; pagination?: InvoicePagination }> => {
        const response = await getApiPaymentsInvoices({
            query: params,
            throwOnError: true,
        });
        const payload: InvoicesResponse = response.data;
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 20;
        const invoices = extractPaginatedItems(payload)
            .map((invoice) => toPaymentInvoice(invoice))
            .filter((invoice): invoice is PaymentInvoice => Boolean(invoice));
        const pagination = extractPagination(payload, { page, limit, itemCount: invoices.length });

        return { invoices, pagination };
    },

    listBillingHistory: async (params?: { limit?: number; page?: number; provider?: BillingHistoryEntry["provider"] }): Promise<{
        entries: BillingHistoryEntry[];
        pagination?: InvoicePagination;
        coverage: BillingHistoryCoverage[];
    }> => {
        const response = await getApiPaymentsBillingHistory({ query: params, throwOnError: true });
        const payload = response.data as any;
        const page = params?.page ?? 1;
        const limit = params?.limit ?? 20;
        const entries = Array.isArray(payload?.data?.items) ? payload.data.items as BillingHistoryEntry[] : [];
        return {
            entries,
            pagination: extractPagination(payload, { page, limit, itemCount: entries.length }),
            coverage: Array.isArray(payload?.coverage) ? payload.coverage as BillingHistoryCoverage[] : [],
        };
    },

    getBillingHistoryEntry: async (id: string): Promise<BillingHistoryEntry> => {
        const response = await getApiPaymentsBillingHistoryById({ path: { id }, throwOnError: true });
        return (response.data as any)?.data as BillingHistoryEntry;
    },

    downloadBillingReceipt: async (id: string): Promise<Blob> => {
        const response = await getApiPaymentsBillingHistoryByIdReceiptPdf({
            path: { id },
            throwOnError: true,
        });
        return response.data as Blob;
    },

};
