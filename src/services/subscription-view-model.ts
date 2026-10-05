import type { PaymentAccessOrigin, PublicEntitlementValue } from '@tragram/types';

/**
 * The generated HTTP client materializes date-time fields as `Date`, while
 * the shared domain contract keeps them serializable as ISO strings. The
 * presentation helpers only need the access state and entitlement map, so
 * accept both representations without introducing a second wire contract.
 */
type PaymentContext = {
  access: {
    state: 'ENTITLED' | 'GRACE' | 'PENDING' | 'ENDED';
    deadline?: string | Date | null;
    entitlementMap: Record<string, PublicEntitlementValue>;
  };
  acquisition: { allowed: boolean; blockerCodes?: string[] };
} | null | undefined;

export type SubscriptionCapability =
  | 'mobile-app-access'
  | 'mt_accounts'
  | 'telegram_channels'
  | 'signal_copying'
  | 'analytics'
  | 'performance_reports'
  | 'execution_without_sl_tp'
  | 'max_active_orders_per_channel'
  | 'max_daily_trades_per_channel';

export const canStartCheckout = (context: PaymentContext): boolean =>
  context?.acquisition.allowed === true;

/** Internal web trials do not require paid billing readiness. All other
 * acquisition blockers (including pauses and competing subscriptions) apply. */
export const canStartInternalWebTrial = (context: PaymentContext): boolean => {
  if (!context) return false;
  if (context.acquisition.allowed) return true;
  const blockers = context.acquisition.blockerCodes;
  return Boolean(blockers?.length && blockers.every((code) => code === 'BILLING_NOT_READY'));
};

export const blocksWebSubscriptionPurchase = (
  hasActiveAccess: boolean,
  origin: PaymentAccessOrigin | undefined,
): boolean => hasActiveAccess && origin !== 'SIGNUP_FREE_TRIAL';

export const hasBooleanCapability = (
  context: PaymentContext,
  capability: SubscriptionCapability,
): boolean => {
  const value = context?.access.entitlementMap[capability];
  return value?.kind === 'BOOLEAN' && value.enabled;
};

export const getLimit = (
  context: PaymentContext,
  capability: SubscriptionCapability,
): number | null => {
  const value = context?.access.entitlementMap[capability];
  return value?.kind === 'LIMIT' ? value.limit : null;
};

export const formatEntitlementValue = (value: PublicEntitlementValue): string | boolean | number => {
  if (value.kind === 'BOOLEAN') return value.enabled;
  return value.unlimited ? 'Unlimited' : value.limit ?? 0;
};

export const isAccessActive = (context: PaymentContext): boolean =>
  context?.access.state === 'ENTITLED' || context?.access.state === 'GRACE';

export const getTrialRemainingParts = (remainingSeconds: number) => {
  const remainingMinutes = Number.isFinite(remainingSeconds)
    ? Math.max(0, Math.ceil(remainingSeconds / 60))
    : 0;
  const days = Math.floor(remainingMinutes / (24 * 60));
  const hours = Math.floor((remainingMinutes % (24 * 60)) / 60);
  const minutes = remainingMinutes % 60;
  return { days, hours, minutes };
};

const timestamp = (value: string | Date | null | undefined): number | null => {
  if (value == null) return null;
  const parsed = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
};

export const getTrialRemainingSeconds = (
  asOf: string | Date | null | undefined,
  endsAt: string | Date | null | undefined,
  fallbackRemainingSeconds: number,
  elapsedSinceSnapshotSeconds = 0,
): number => {
  const snapshotTime = timestamp(asOf);
  const endTime = timestamp(endsAt);
  const remainingAtSnapshot = snapshotTime !== null && endTime !== null
    ? (endTime - snapshotTime) / 1000
    : fallbackRemainingSeconds;
  const elapsed = Number.isFinite(elapsedSinceSnapshotSeconds)
    ? Math.max(0, elapsedSinceSnapshotSeconds)
    : 0;
  return Math.max(0, remainingAtSnapshot - elapsed);
};

export const normalizePublicPlanCode = (code: string | null | undefined): string | null => {
  const normalized = code?.trim().toLowerCase();
  if (!normalized) return null;
  return normalized === 'enterprise' ? 'max' : normalized;
};

export const getSubscriptionPauseTitleKey = (
  reason: string | null | undefined,
): 'expired' | 'required' | 'inactive' | 'feature' | 'limit' | 'unavailable' => {
  switch (reason) {
    case 'SUBSCRIPTION_EXPIRED': return 'expired';
    case 'NO_SUBSCRIPTION': return 'required';
    case 'SUBSCRIPTION_INACTIVE': return 'inactive';
    case 'FEATURE_NOT_INCLUDED': return 'feature';
    case 'MT_ACCOUNT_LIMIT':
    case 'TELEGRAM_CHANNEL_LIMIT': return 'limit';
    default: return 'unavailable';
  }
};

export const getPendingConfirmoCheckoutId = (
  response: {
    currentPlan?: {
      provider: string | null;
      lifecycleState: string;
      subscriptionId: string;
    } | null;
  } | null | undefined,
): string | null => {
  const currentPlan = response?.currentPlan;
  if (
    currentPlan?.provider !== 'CONFIRMO' ||
    currentPlan.lifecycleState !== 'PENDING' ||
    !currentPlan.subscriptionId.trim()
  ) {
    return null;
  }

  return currentPlan.subscriptionId;
};
