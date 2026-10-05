import { hasActiveSubscriptionAccess } from "./subscription-access";

describe("hasActiveSubscriptionAccess", () => {
  test("returns true for active subscriptions", () => {
    expect(
      hasActiveSubscriptionAccess({
        id: "sub-1",
        planId: "pro",
        status: "ACTIVE",
        billingPeriod: "MONTHLY",
        currentPeriodEnd: "2026-09-01T00:00:00.000Z",
      },
      new Date("2026-08-18T12:00:00.000Z")
      )
    ).toBe(true);
  });

  test("returns false when subscription is missing or inactive", () => {
    expect(hasActiveSubscriptionAccess(null)).toBe(false);
    expect(
      hasActiveSubscriptionAccess({
        id: "sub-3",
        planId: "pro",
        status: "CANCELLED",
        billingPeriod: "MONTHLY",
      })
    ).toBe(false);
  });

  test("keeps access for a canceled subscription until its provider period ends", () => {
    expect(
      hasActiveSubscriptionAccess(
        {
          id: "sub-4",
          planId: "pro",
          status: "CANCELLED",
          billingPeriod: "MONTHLY",
          cancelAtPeriodEnd: true,
          accessEndsAt: "2026-09-01T00:00:00.000Z",
        },
        new Date("2026-08-18T12:00:00.000Z")
      )
    ).toBe(true);
    expect(
      hasActiveSubscriptionAccess(
        {
          id: "sub-5",
          planId: "pro",
          status: "CANCELLED",
          billingPeriod: "MONTHLY",
          cancelAtPeriodEnd: true,
          accessEndsAt: "2026-08-01T00:00:00.000Z",
        },
        new Date("2026-08-18T12:00:00.000Z")
      )
    ).toBe(false);
  });

  test("keeps access during a bounded past-due grace window", () => {
    expect(
      hasActiveSubscriptionAccess(
        {
          id: "sub-grace",
          planId: "pro",
          status: "PAST_DUE",
          billingPeriod: "MONTHLY",
          accessState: "GRACE",
          accessEndsAt: "2026-08-20T12:00:00.000Z",
        },
        new Date("2026-08-18T12:00:00.000Z")
      )
    ).toBe(true);
  });
});
