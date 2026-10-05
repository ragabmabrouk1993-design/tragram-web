import {
  clearChannelActionKey,
  getOrCreateChannelActionKey,
} from './channel-action-idempotency';

describe('channel action idempotency keys', () => {
  test('reuses a key for retries of the same action and subscription', () => {
    const store = new Map<string, string>();
    const createSuffix = jest.fn(() => 'suffix-1');

    const first = getOrCreateChannelActionKey(
      store,
      'access-refresh',
      'subscription-1',
      createSuffix,
    );
    const retry = getOrCreateChannelActionKey(
      store,
      'access-refresh',
      'subscription-1',
      createSuffix,
    );

    expect(first).toBe('access-refresh:subscription-1:suffix-1');
    expect(retry).toBe(first);
    expect(createSuffix).toHaveBeenCalledTimes(1);
  });

  test('keeps different actions and subscriptions in separate entries', () => {
    const store = new Map<string, string>();
    let suffix = 0;

    const accessRefreshKey = getOrCreateChannelActionKey(
      store,
      'access-refresh',
      'subscription-1',
      () => `suffix-${++suffix}`,
    );
    const migrationKey = getOrCreateChannelActionKey(
      store,
      'migration-accept',
      'subscription-1',
      () => `suffix-${++suffix}`,
    );
    const otherSubscriptionKey = getOrCreateChannelActionKey(
      store,
      'access-refresh',
      'subscription-2',
      () => `suffix-${++suffix}`,
    );

    expect(new Set([accessRefreshKey, migrationKey, otherSubscriptionKey]).size).toBe(3);
    expect(store.size).toBe(3);
  });

  test('clearing a key allows a later action to get a new key', () => {
    const store = new Map<string, string>();
    const createSuffix = jest
      .fn(() => 'suffix-fallback')
      .mockReturnValueOnce('suffix-1')
      .mockReturnValueOnce('suffix-2');

    const first = getOrCreateChannelActionKey(
      store,
      'register',
      'scope-1',
      createSuffix,
    );
    clearChannelActionKey(store, 'register', 'scope-1');
    const next = getOrCreateChannelActionKey(store, 'register', 'scope-1', createSuffix);

    expect(first).toBe('register:scope-1:suffix-1');
    expect(next).toBe('register:scope-1:suffix-2');
    expect(store.get('register:scope-1')).toBe(next);
  });
});
