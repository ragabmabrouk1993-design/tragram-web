import {
  createCoalescedDashboardRefresh,
  resolveDashboardRealtimeErrorAction,
} from './dashboard-realtime-recovery';

describe('dashboard realtime recovery', () => {
  const subscriptionErrorCodes = new Set(['SUBSCRIPTION_REQUIRED', 'PLAN_REQUIRED']);

  it('classifies revision gaps as recoverable snapshot errors', () => {
    expect(resolveDashboardRealtimeErrorAction('REVISION_GAP', subscriptionErrorCodes)).toBe(
      'revision-gap'
    );
    expect(resolveDashboardRealtimeErrorAction('SUBSCRIPTION_REQUIRED', subscriptionErrorCodes)).toBe(
      'subscription-required'
    );
    expect(resolveDashboardRealtimeErrorAction('SOCKET_FAILURE', subscriptionErrorCodes)).toBe(
      'transport-error'
    );
  });

  it('coalesces overlapping snapshot refreshes and allows a later retry', async () => {
    let resolveRefresh: (() => void) | undefined;
    const refresh = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveRefresh = resolve;
        })
    );
    const recover = createCoalescedDashboardRefresh(refresh);

    const first = recover();
    const second = recover();
    expect(first).toBe(second);
    expect(refresh).toHaveBeenCalledTimes(1);

    resolveRefresh?.();
    await first;

    const third = recover();
    expect(third).not.toBe(first);
    expect(refresh).toHaveBeenCalledTimes(2);
    resolveRefresh?.();
    await third;
  });
});
