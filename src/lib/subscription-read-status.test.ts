import { normalizeSubscriptionReadStatus } from './subscription-read-status';

describe('normalizeSubscriptionReadStatus', () => {
  it('keeps a known expired status and message', () => {
    expect(
      normalizeSubscriptionReadStatus({
        subscriptionPaused: true,
        subscriptionPauseReason: 'SUBSCRIPTION_EXPIRED',
        subscriptionPauseMessage: 'Renew your plan.',
      }),
    ).toEqual({
      subscriptionPaused: true,
      subscriptionPauseReason: 'SUBSCRIPTION_EXPIRED',
      subscriptionPauseMessage: 'Renew your plan.',
    });
  });

  it('treats unknown reason codes as a generic paused state', () => {
    expect(
      normalizeSubscriptionReadStatus({
        subscriptionPaused: true,
        subscriptionPauseReason: 'NEW_REASON_FROM_SERVER',
      }),
    ).toEqual({
      subscriptionPaused: true,
      subscriptionPauseReason: null,
      subscriptionPauseMessage: null,
    });
  });

  it('preserves legacy responses without metadata as unpaused', () => {
    expect(normalizeSubscriptionReadStatus({ success: true, data: [] })).toEqual({
      subscriptionPaused: false,
      subscriptionPauseReason: null,
      subscriptionPauseMessage: null,
    });
  });

  it('does not keep a reason when the response explicitly is not paused', () => {
    expect(
      normalizeSubscriptionReadStatus({
        subscriptionPaused: false,
        subscriptionPauseReason: 'SUBSCRIPTION_EXPIRED',
        subscriptionPauseMessage: 'stale',
      }),
    ).toEqual({
      subscriptionPaused: false,
      subscriptionPauseReason: null,
      subscriptionPauseMessage: null,
    });
  });
});
