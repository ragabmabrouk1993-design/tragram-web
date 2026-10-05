import { resolveNotificationRealtimeContext } from './notification-realtime-context';

describe('notification realtime user scope', () => {
  it('refreshes an account-bound event before account context is ready', () => {
    expect(
      resolveNotificationRealtimeContext({
        eventMtAccountId: 'mt-primary',
        selectedMtAccountId: null,
        accountContextReady: false,
      }),
    ).toBe('refresh');
  });

  it('refreshes a matching account-bound event once the context is ready', () => {
    expect(
      resolveNotificationRealtimeContext({
        eventMtAccountId: 'mt-primary',
        selectedMtAccountId: 'mt-primary',
        accountContextReady: true,
      }),
    ).toBe('refresh');
  });

  it('refreshes an event for a different selected account', () => {
    expect(
      resolveNotificationRealtimeContext({
        eventMtAccountId: 'mt-secondary',
        selectedMtAccountId: 'mt-primary',
        accountContextReady: true,
      }),
    ).toBe('refresh');
  });

  it('keeps global events relevant before account loading completes', () => {
    expect(
      resolveNotificationRealtimeContext({
        eventMtAccountId: null,
        selectedMtAccountId: null,
        accountContextReady: false,
      }),
    ).toBe('refresh');
  });
});
