import {
  canStartCheckout,
  canStartInternalWebTrial,
  blocksWebSubscriptionPurchase,
  formatEntitlementValue,
  getLimit,
  hasBooleanCapability,
  isAccessActive,
  getPendingConfirmoCheckoutId,
  getTrialRemainingParts,
  getTrialRemainingSeconds,
  getSubscriptionPauseTitleKey,
  normalizePublicPlanCode,
} from './subscription-view-model';
import type { PaymentContextResponse } from '@tragram/types';

const contract: PaymentContextResponse = {
  success: true,
  schemaVersion: 1,
  catalogVersion: 'catalog-v1',
  access: {
    subscriptionId: 'sub-1', state: 'ENTITLED', source: 'PAID', planCode: 'basic',
    planVersion: 'basic:v2', deadline: '2026-09-01T00:00:00.000Z',
    entitlementMap: {
      'mobile-app-access': { kind: 'BOOLEAN', enabled: true },
      mt_accounts: { kind: 'LIMIT', limit: 1, unlimited: false },
      telegram_channels: { kind: 'LIMIT', limit: 3, unlimited: false },
      signal_copying: { kind: 'BOOLEAN', enabled: true },
      analytics: { kind: 'BOOLEAN', enabled: false },
      performance_reports: { kind: 'BOOLEAN', enabled: true },
      execution_without_sl_tp: { kind: 'BOOLEAN', enabled: false },
      max_active_orders_per_channel: { kind: 'LIMIT', limit: 1, unlimited: false },
      max_daily_trades_per_channel: { kind: 'LIMIT', limit: 5, unlimited: false },
    },
  },
  billing: {
    subscription: {
      provider: 'CONFIRMO', state: 'ACTIVE', planCode: 'basic', period: 'MONTHLY',
      productId: null, basePlanId: null, offerId: null, autoRenewing: true,
      managementUrl: null, isTest: false,
    },
  },
  acquisition: { allowed: false, blockerCodes: ['SUBSCRIPTION_PERIOD_ACTIVE'], sandboxEnvironment: null, providerAccountToken: null },
  catalog: null,
};

test('presentation uses server acquisition and access decisions', () => {
  expect(canStartCheckout(contract)).toBe(false);
  expect(isAccessActive(contract)).toBe(true);
  expect(hasBooleanCapability(contract, 'performance_reports')).toBe(true);
  expect(hasBooleanCapability(contract, 'analytics')).toBe(false);
  expect(getLimit(contract, 'mt_accounts')).toBe(1);
  expect(formatEntitlementValue(contract.access.entitlementMap.mt_accounts)).toBe(1);
});

test('internal web trials bypass only paid billing-readiness blockers', () => {
  expect(canStartInternalWebTrial({ ...contract, acquisition: { ...contract.acquisition, blockerCodes: ['BILLING_NOT_READY'] } })).toBe(true);
  expect(canStartInternalWebTrial({ ...contract, acquisition: { ...contract.acquisition, blockerCodes: ['SUBSCRIPTION_PERIOD_ACTIVE'] } })).toBe(false);
  expect(canStartInternalWebTrial({ ...contract, acquisition: { ...contract.acquisition, blockerCodes: ['BILLING_NOT_READY', 'PAYMENT_ACQUISITION_PAUSED'] } })).toBe(false);
  expect(canStartInternalWebTrial(undefined)).toBe(false);
});

test('unlimited limits are explicit', () => {
  const max = { ...contract, access: { ...contract.access, entitlementMap: { ...contract.access.entitlementMap, mt_accounts: { kind: 'LIMIT' as const, limit: null, unlimited: true } } } };
  expect(getLimit(max, 'mt_accounts')).toBeNull();
  expect(formatEntitlementValue(max.access.entitlementMap.mt_accounts)).toBe('Unlimited');
});

test('a signup grant does not block a web subscription purchase', () => {
  expect(blocksWebSubscriptionPurchase(true, 'SIGNUP_FREE_TRIAL')).toBe(false);
  expect(blocksWebSubscriptionPurchase(true, 'CONFIRMO')).toBe(true);
  expect(blocksWebSubscriptionPurchase(true, undefined)).toBe(true);
});

test('a pending Confirmo checkout exposes its subscription id for explicit cancellation', () => {
  expect(getPendingConfirmoCheckoutId({
    currentPlan: { provider: 'CONFIRMO', lifecycleState: 'PENDING', subscriptionId: 'sub-pending' },
  } as never)).toBe('sub-pending');
});

test('only a pending Confirmo checkout can be canceled through this flow', () => {
  expect(getPendingConfirmoCheckoutId({
    currentPlan: { provider: 'APPLE', lifecycleState: 'PENDING', subscriptionId: 'sub-native' },
  } as never)).toBeNull();
  expect(getPendingConfirmoCheckoutId({
    currentPlan: { provider: 'CONFIRMO', lifecycleState: 'ACTIVE', subscriptionId: 'sub-active' },
  } as never)).toBeNull();
  expect(getPendingConfirmoCheckoutId({ currentPlan: null } as never)).toBeNull();
});

test('converts remaining trial seconds into a stable localized duration shape', () => {
  expect(getTrialRemainingParts(90_061)).toEqual({ days: 1, hours: 1, minutes: 2 });
  expect(getTrialRemainingParts(1)).toEqual({ days: 0, hours: 0, minutes: 1 });
  expect(getTrialRemainingParts(0)).toEqual({ days: 0, hours: 0, minutes: 0 });
});

test('counts down from the server as-of snapshot for ISO strings and Date values', () => {
  const asOf = '2026-09-27T12:00:00.000Z';
  const endsAt = '2026-09-28T12:00:00.000Z';
  expect(getTrialRemainingSeconds(asOf, endsAt, 86_000, 60)).toBe(86_340);
  expect(getTrialRemainingSeconds(new Date(asOf), new Date(endsAt), 86_000, 60)).toBe(86_340);
  expect(getTrialRemainingSeconds('invalid', endsAt, 120, 30)).toBe(90);
});

test('normalizes public Max identifiers and maps expiry to its own notice title', () => {
  expect(normalizePublicPlanCode('enterprise')).toBe('max');
  expect(normalizePublicPlanCode('max')).toBe('max');
  expect(getSubscriptionPauseTitleKey('SUBSCRIPTION_EXPIRED')).toBe('expired');
  expect(getSubscriptionPauseTitleKey('NO_SUBSCRIPTION')).toBe('required');
});
