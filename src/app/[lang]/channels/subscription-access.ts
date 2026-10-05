import type { UserSubscription } from "@/services/payment.service";

export const hasActiveSubscriptionAccess = (
  subscription: UserSubscription | null | undefined,
  now: Date = new Date()
): boolean => {
  if (subscription?.accessState === "ENTITLED" || subscription?.accessState === "GRACE") {
    const accessEndsAt = subscription.accessEndsAt || subscription.currentPeriodEnd;
    if (!accessEndsAt) return false;
    const end = new Date(accessEndsAt).getTime();
    return Number.isFinite(end) && end > now.getTime();
  }
  if (subscription?.accessState === "PENDING" || subscription?.accessState === "ENDED") {
    return false;
  }
  if (subscription?.status === "ACTIVE") {
    const accessEndsAt = subscription.accessEndsAt || subscription.currentPeriodEnd;
    if (!accessEndsAt) return false;
    const end = new Date(accessEndsAt).getTime();
    return Number.isFinite(end) && end > now.getTime();
  }

  if (subscription?.status !== "CANCELLED" || subscription.cancelAtPeriodEnd !== true) {
    return false;
  }

  const accessEndsAt = subscription.accessEndsAt || subscription.currentPeriodEnd;
  if (!accessEndsAt) {
    return false;
  }

  const end = new Date(accessEndsAt).getTime();
  return Number.isFinite(end) && end > now.getTime();
};
