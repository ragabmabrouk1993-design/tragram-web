export type DashboardRealtimeErrorAction =
  | 'revision-gap'
  | 'subscription-required'
  | 'transport-error';

export const resolveDashboardRealtimeErrorAction = (
  code: unknown,
  subscriptionErrorCodes: ReadonlySet<string>
): DashboardRealtimeErrorAction => {
  const normalizedCode = typeof code === 'string' ? code : '';
  if (normalizedCode === 'REVISION_GAP') {
    return 'revision-gap';
  }
  if (subscriptionErrorCodes.has(normalizedCode)) {
    return 'subscription-required';
  }
  return 'transport-error';
};

/** Keep bursts of the same recovery signal from issuing overlapping REST reads. */
export const createCoalescedDashboardRefresh = (
  refresh: () => Promise<void>
): (() => Promise<void>) => {
  let inFlight: Promise<void> | null = null;

  return () => {
    if (inFlight) {
      return inFlight;
    }

    let refreshPromise: Promise<void>;
    try {
      refreshPromise = refresh();
    } catch (error) {
      refreshPromise = Promise.reject(error);
    }
    const pending = Promise.resolve(refreshPromise);
    const recovery = pending.finally(() => {
      if (inFlight === recovery) {
        inFlight = null;
      }
    });
    inFlight = recovery;
    return recovery;
  };
};
