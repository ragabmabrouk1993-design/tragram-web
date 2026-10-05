export type NotificationRealtimeContextDecision = 'refresh' | 'defer' | 'ignore';

export const resolveNotificationRealtimeContext = (input: {
  eventMtAccountId: string | null | undefined;
  selectedMtAccountId: string | null | undefined;
  accountContextReady: boolean;
}): NotificationRealtimeContextDecision => {
  // Notification events are delivered to the authenticated user's room. The
  // account fields remain provenance metadata, but never filter that user's
  // inbox or delay a refresh while the trading account context is loading.
  void input;
  return 'refresh';
};
