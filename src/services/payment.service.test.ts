const postApiPaymentsSubscriptionsBySubscriptionIdCancelMock = jest.fn();
const postApiPaymentsTrialChallengeMock = jest.fn();
const postApiPaymentsTrialSubscriptionMock = jest.fn();

jest.mock("@/lib/api-client", () => ({
    getApiPaymentsInvoices: jest.fn(),
    getApiPaymentsPricingPage: jest.fn(),
    getApiPaymentsContext: jest.fn(),
    getApiPaymentsPlans: jest.fn(),
    getApiPaymentsCurrentPlan: jest.fn(),
    getApiPaymentsSubscriptionsCheckoutsByCheckoutIntentId: jest.fn(),
    getApiPaymentsSubscriptionsCheckoutsCurrent: jest.fn(),
    getApiPaymentsSubscriptionsBySubscriptionIdPayments: jest.fn(),
    postApiPaymentsSubscriptionsCheckout: jest.fn(),
    postApiPaymentsSubscriptionsBySubscriptionIdCancel:
        postApiPaymentsSubscriptionsBySubscriptionIdCancelMock,
    postApiPaymentsTrialChallenge: postApiPaymentsTrialChallengeMock,
    postApiPaymentsTrialSubscription: postApiPaymentsTrialSubscriptionMock,
}));

jest.mock("@/lib/api-client-setup", () => ({
    initApiClient: jest.fn(),
}));

import { contextToUserSubscription, paymentService, formatInvoiceStatusLabel } from "./payment.service";
import type { PaymentCurrentPlanResponse } from "@/lib/api-client";

const { getApiPaymentsPlans, getApiPaymentsCurrentPlan, getApiPaymentsPricingPage, getApiPaymentsSubscriptionsCheckoutsCurrent } = jest.requireMock("@/lib/api-client") as {
    getApiPaymentsPlans: jest.Mock;
    getApiPaymentsCurrentPlan: jest.Mock;
    getApiPaymentsPricingPage: jest.Mock;
    getApiPaymentsSubscriptionsCheckoutsCurrent: jest.Mock;
};

describe("paymentService.plan APIs", () => {
    test("uses translated invoice labels and never prints unknown status codes", () => {
        expect(Reflect.apply(formatInvoiceStatusLabel, null, ['paid', {paid:'تم الدفع',unknown:'الحالة غير متاحة'}])).toBe('تم الدفع');
        expect(formatInvoiceStatusLabel('INTERNAL_PROVIDER_ERROR')).toBe('Status unavailable');
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("loads the provider-neutral backend plan catalog through the generated client", async () => {
        const payload = { success: true, schemaVersion: 1, catalogVersion: "catalog-v2", plans: [] } as const;
        getApiPaymentsPlans.mockResolvedValue({ data: payload });

        await expect(paymentService.getSubscriptionPlans()).resolves.toBe(payload);
        expect(getApiPaymentsPlans).toHaveBeenCalledWith({ throwOnError: true });
    });

    test("loads the authenticated current-plan snapshot through the generated client", async () => {
        const payload = {
            success: true,
            schemaVersion: 1,
            asOf: new Date("2026-09-05T00:00:00.000Z"),
            currentPlan: null,
            freeTrial: { active: false, startedAt: null, endsAt: null, daysRemaining: 0 },
            features: [],
        } as unknown as PaymentCurrentPlanResponse;
        getApiPaymentsCurrentPlan.mockResolvedValue({ data: payload });

        await expect(paymentService.getCurrentPlan()).resolves.toBe(payload);
        expect(getApiPaymentsCurrentPlan).toHaveBeenCalledWith({ throwOnError: true });
    });

    test("treats a missing resumable checkout as an empty state", async () => {
        getApiPaymentsSubscriptionsCheckoutsCurrent.mockRejectedValue({ response: { status: 404 } });
        await expect(paymentService.getCurrentSubscriptionCheckout()).resolves.toBeNull();
        expect(getApiPaymentsSubscriptionsCheckoutsCurrent).toHaveBeenCalledWith({ throwOnError: true });
    });

    test("loads shell context from current-plan while preserving its account fields", async () => {
        const payload = { access: { state: 'ENDED' }, billing: { provider: null }, acquisition: { allowed: false }, catalogVersion: null };
        getApiPaymentsCurrentPlan.mockResolvedValue({ data: payload });
        await expect(paymentService.getContext({ platform: 'IOS', country: 'EG' })).resolves.toMatchObject({ ...payload, catalog: null });
        expect(getApiPaymentsCurrentPlan).toHaveBeenCalledWith(expect.objectContaining({ query: expect.objectContaining({ platform: 'IOS', country: 'EG' }) }));
    });

    test("retains a precise signup-grant origin without trusting the legacy source alias", () => {
        expect(contextToUserSubscription({
            access: {
                subscriptionId: 'trial-1', planCode: 'pro', state: 'ENTITLED',
                source: 'ADMIN_GRANT', origin: 'SIGNUP_FREE_TRIAL', deadline: '2026-09-10T00:00:00.000Z',
            },
            billing: { subscription: null },
        })).toMatchObject({ id: 'trial-1', origin: 'SIGNUP_FREE_TRIAL' });
        expect(contextToUserSubscription({
            access: { subscriptionId: 'legacy-1', planCode: 'pro', state: 'ENTITLED', source: 'ADMIN_GRANT', deadline: null },
            billing: { subscription: null },
        })).toMatchObject({ origin: undefined });
    });

    test("keeps custom plan codes, absent paid prices, and configured internal trial policy", async () => {
        getApiPaymentsPricingPage.mockResolvedValue({
            data: {
                website: "main",
                locale: "en",
                country: null,
                defaultBillingView: "monthly",
                currency: "USD",
                showTaxDisclaimer: false,
                plans: [{
                    code: "starter_plus",
                    planVersionId: "starter_plus:v1",
                    name: "Starter Plus",
                    recommended: false,
                    sortOrder: 4,
                    prices: {
                        monthly: null,
                        yearly: {
                            id: "starter_plus:v1:yearly",
                            lookupKey: "starter_plus_v1_yearly_usd",
                            provider: "CONFIRMO",
                            currency: "USD",
                            billingInterval: "YEARLY",
                            amountMinor: 4500,
                            display: "$45.00 / year",
                        },
                    },
                    cta: { type: "signup", label: "Start trial" },
                    highlights: [],
                    featureSummary: [],
                    trialGrant: { enabled: true, days: 7, salesChannels: ["IOS_APP"] },
                }],
                comparison: [],
            },
        });

        await expect(paymentService.getPricingPage()).resolves.toMatchObject({
            plans: [expect.objectContaining({
                code: "starter_plus",
                planVersionId: "starter_plus:v1",
                prices: expect.objectContaining({ monthly: undefined, yearly: expect.objectContaining({ amountMinor: 4500 }) }),
                trialGrant: { enabled: true, days: 7, salesChannels: ["IOS_APP"] },
            })],
        });
    });

    test("creates a plan-bound trial challenge and starts a trial with proof", async () => {
        const challenge = {
            success: true,
            challenge_id: "challenge-1",
            nonce: "nonce-1",
            expires_at: new Date("2026-09-13T17:00:00.000Z"),
        };
        const currentPlan = { success: true, hasPlan: true };
        postApiPaymentsTrialChallengeMock.mockResolvedValue({ data: challenge });
        postApiPaymentsTrialSubscriptionMock.mockResolvedValue({ data: currentPlan });

        await expect(paymentService.createTrialChallenge({
            plan_id: "basic",
            plan_version_id: "basic:v2",
            sales_channel: "WEB",
        })).resolves.toBe(challenge);
        await expect(paymentService.startTrial({
            plan_id: "basic",
            plan_version_id: "basic:v2",
            sales_channel: "WEB",
            fingerprint_event_id: "event-1",
            fingerprint_challenge_id: "challenge-1",
        })).resolves.toBe(currentPlan);

        expect(postApiPaymentsTrialChallengeMock).toHaveBeenCalledWith({
            body: { plan_id: "basic", plan_version_id: "basic:v2", sales_channel: "WEB" },
            throwOnError: true,
        });
        expect(postApiPaymentsTrialSubscriptionMock).toHaveBeenCalledWith({
            body: expect.objectContaining({ fingerprint_event_id: "event-1", fingerprint_challenge_id: "challenge-1" }),
            throwOnError: true,
        });
    });
});

describe("paymentService.cancelSubscription", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        postApiPaymentsSubscriptionsBySubscriptionIdCancelMock.mockResolvedValue({
            data: {
                success: true,
                autoRenews: false,
                cancelledAt: "2026-08-18T12:00:00.000Z",
                accessEndsAt: "2026-09-01T00:00:00.000Z",
                subscription: {
                    id: "subscription-1",
                    planId: "plan-1",
                    status: "CANCELLED",
                    billingPeriod: "MONTHLY",
                    currentPeriodStart: "2026-08-01T00:00:00.000Z",
                    currentPeriodEnd: "2026-09-01T00:00:00.000Z",
                    cancelAtPeriodEnd: true,
                    autoRenews: false,
                    accessEndsAt: "2026-09-01T00:00:00.000Z",
                },
            },
        });
    });

    test("cancels the selected subscription and keeps the provider access deadline", async () => {
        const result = await paymentService.cancelSubscription("subscription-1");

        expect(postApiPaymentsSubscriptionsBySubscriptionIdCancelMock).toHaveBeenCalledWith({
            path: { subscriptionId: "subscription-1" },
            throwOnError: true,
        });
        expect(result).toEqual(
            expect.objectContaining({
                autoRenews: false,
                cancelledAt: "2026-08-18T12:00:00.000Z",
                accessEndsAt: "2026-09-01T00:00:00.000Z",
                subscription: expect.objectContaining({
                    status: "CANCELLED",
                    cancelAtPeriodEnd: true,
                    accessEndsAt: "2026-09-01T00:00:00.000Z",
                }),
            })
        );
    });
});
