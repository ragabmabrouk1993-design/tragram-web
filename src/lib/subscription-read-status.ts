import type { SubscriptionReadStatus } from '@/lib/api-client';

export type SubscriptionPauseReason = NonNullable<SubscriptionReadStatus['subscriptionPauseReason']>;

export type NormalizedSubscriptionReadStatus = {
  subscriptionPaused: boolean;
  subscriptionPauseReason: SubscriptionPauseReason | null;
  subscriptionPauseMessage: string | null;
};

const pauseReasons = new Set<SubscriptionPauseReason>([
  'NO_SUBSCRIPTION',
  'SUBSCRIPTION_EXPIRED',
  'SUBSCRIPTION_INACTIVE',
  'FEATURE_NOT_INCLUDED',
  'MT_ACCOUNT_LIMIT',
  'TELEGRAM_CHANNEL_LIMIT',
]);

const emptyStatus = (): NormalizedSubscriptionReadStatus => ({
  subscriptionPaused: false,
  subscriptionPauseReason: null,
  subscriptionPauseMessage: null,
});

export const normalizeSubscriptionReadStatus = (
  payload: unknown
): NormalizedSubscriptionReadStatus => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return emptyStatus();
  }

  const record = payload as Record<string, unknown>;
  const paused = record.subscriptionPaused === true;
  const rawReason = record.subscriptionPauseReason;
  const reason =
    typeof rawReason === 'string' && pauseReasons.has(rawReason as SubscriptionPauseReason)
      ? (rawReason as SubscriptionPauseReason)
      : null;
  const message =
    typeof record.subscriptionPauseMessage === 'string' &&
    record.subscriptionPauseMessage.trim().length > 0
      ? record.subscriptionPauseMessage.trim()
      : null;

  return {
    subscriptionPaused: paused,
    subscriptionPauseReason: paused ? reason : null,
    subscriptionPauseMessage: paused ? message : null,
  };
};

export const subscriptionPauseFallbackMessage =
  'Subscription access is unavailable. Review your plan to continue.';
