'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';
import type { PaymentCurrentPlanResponse, SubscriptionReadStatus } from '@/lib/api-client';
import { useRouteMessages } from '@/components/i18n/route-messages-provider';
import { localizePath } from '@/lib/i18n';
import {
  normalizeSubscriptionReadStatus,
  type NormalizedSubscriptionReadStatus,
} from '@/lib/subscription-read-status';
import { isBillingDisabledInCurrentEnv } from '@/lib/runtime-environment';
import { paymentService } from '@/services/payment.service';
import { getSubscriptionPauseTitleKey, normalizePublicPlanCode } from '@/services/subscription-view-model';

type SubscriptionPausedNoticeProps = {
  status?: SubscriptionReadStatus | NormalizedSubscriptionReadStatus | null;
  href?: string;
  previousSubscription?: PaymentCurrentPlanResponse['previousSubscription'];
};

export function SubscriptionPausedNotice({
  status,
  href,
  previousSubscription: providedPreviousSubscription,
}: SubscriptionPausedNoticeProps) {
  const locale = useLocale();
  const messages = useRouteMessages().billingFeedback;
  const billingDisabled = isBillingDisabledInCurrentEnv();
  const normalized = normalizeSubscriptionReadStatus(status);
  const [loadedPreviousSubscription, setLoadedPreviousSubscription] = useState<PaymentCurrentPlanResponse['previousSubscription']>(null);

  useEffect(() => {
    if (!normalized.subscriptionPaused || normalized.subscriptionPauseReason !== 'SUBSCRIPTION_EXPIRED' || providedPreviousSubscription) {
      return;
    }
    let isMounted = true;
    paymentService.getCurrentPlan()
      .then((result) => {
        const expiredCurrentPlan = result.currentPlan?.lifecycleState === 'EXPIRED' && result.currentPlan.accessEndsAt
          ? {
              code: result.currentPlan.code,
              name: result.currentPlan.name,
              billingPeriod: result.currentPlan.billingPeriod,
              provider: result.currentPlan.provider,
              origin: result.currentPlan.origin ?? null,
              lifecycleState: 'EXPIRED' as const,
              accessEndedAt: result.currentPlan.accessEndsAt,
              wasTrial: Boolean(result.freeTrial.kind),
              managementUrl: result.currentPlan.managementUrl,
            }
          : null;
        if (isMounted) setLoadedPreviousSubscription(result.previousSubscription ?? expiredCurrentPlan);
      })
      .catch(() => {
        if (isMounted) setLoadedPreviousSubscription(null);
      });
    return () => { isMounted = false; };
  }, [normalized.subscriptionPaused, normalized.subscriptionPauseReason, providedPreviousSubscription]);

  if (!normalized.subscriptionPaused) {
    return null;
  }

  const previousSubscription = providedPreviousSubscription ?? loadedPreviousSubscription;
  const titleKey = normalized.subscriptionPauseReason === 'SUBSCRIPTION_EXPIRED' && previousSubscription?.wasTrial
    ? 'trialEnded'
    : getSubscriptionPauseTitleKey(normalized.subscriptionPauseReason);
  const title = messages.subscriptionNoticeTitles[titleKey];
  const previousPlanCode = previousSubscription?.lifecycleState === 'EXPIRED'
    ? normalizePublicPlanCode(previousSubscription.code)
    : null;
  const previousPlanName = previousSubscription?.name?.trim() || previousPlanCode;
  const endedAt = previousSubscription?.accessEndedAt
    ? new Date(previousSubscription.accessEndedAt)
    : null;
  const previousEndedAtLabel = endedAt && !Number.isNaN(endedAt.getTime())
    ? new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(endedAt)
    : null;
  const resubscribeHref = previousPlanCode
    ? localizePath(locale, `/profile/subscription?resubscribePlan=${encodeURIComponent(previousPlanCode)}&billingPeriod=${previousSubscription?.billingPeriod ?? 'YEARLY'}`)
    : href ?? (billingDisabled ? localizePath(locale, '/auth/signup') : localizePath(locale, '/profile/subscription'));

  return (
    <div className="dashboard-message-card dashboard-card-muted subscription-paused-notice" role="status" aria-live="polite">
      <p className="dashboard-message-title">{title}</p>
      <p className="dashboard-message-subtitle">
        {messages.subscriptionNoticeDetails[titleKey] ?? normalized.subscriptionPauseMessage}
      </p>
      {previousPlanName && previousEndedAtLabel && (
        <p className="dashboard-message-subtitle">
          {(previousSubscription?.wasTrial ? messages.subscriptionTrialExpiredPlan : messages.subscriptionExpiredPlan)
            .replace('{plan}', previousPlanName)
            .replace('{date}', previousEndedAtLabel)}
        </p>
      )}
      <Link className="dashboard-link-button" href={resubscribeHref}>
        {previousPlanName
          ? messages.subscriptionResubscribePlan.replace('{plan}', previousPlanName)
          : messages.subscriptionNoticeRenew}
      </Link>
    </div>
  );
}
