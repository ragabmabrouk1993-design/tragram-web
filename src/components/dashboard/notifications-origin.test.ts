import { resolveNotificationOriginLabel } from './notifications-origin';

describe('resolveNotificationOriginLabel', () => {
  const labels = {
    originAccount: 'Origin MT account: {account}',
    retainedAccount: 'Retained account history',
  };

  it('uses the broker account number instead of the internal account UUID', () => {
    expect(
      resolveNotificationOriginLabel(
        { mtAccountId: 'internal-account-uuid', scopeKind: 'MT_ACCOUNT' },
        { 'internal-account-uuid': '12345678' },
        labels,
      ),
    ).toBe('Origin MT account: 12345678');
  });

  it('does not expose an unmapped internal UUID', () => {
    expect(
      resolveNotificationOriginLabel(
        { mtAccountId: 'deleted-account-uuid', scopeKind: 'MT_ACCOUNT' },
        {},
        labels,
      ),
    ).toBe('Retained account history');
  });

  it('does not show an origin label for global notifications', () => {
    expect(resolveNotificationOriginLabel({ scopeKind: 'GLOBAL' }, {}, labels)).toBeNull();
  });
});
