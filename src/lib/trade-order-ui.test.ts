import {
  formatTradeOrderLocalDateTime,
  getTradeTakeProfitProgress,
  normalizeTradeOrderTimestamp,
  normalizeTradeTakeProfitTargets,
  parseTradeOrderDate,
  resolveTradeCloseReasonBadge,
  resolveTradeCloseReasonLabel,
  resolveTradeOrderRowTime,
} from './trade-order-ui';

describe('normalizeTradeTakeProfitTargets', () => {
  test('normalizes percentage on explicit TP target rows only', () => {
    expect(
      normalizeTradeTakeProfitTargets([
        { level: 1, price: 4530, percentage: 40, status: 'TAKEN' },
        { level: 2, price: 4540, percentage: null, status: 'REMAINING' },
      ])
    ).toEqual([
      { level: 1, price: 4530, percentage: 40, status: 'TAKEN' },
      { level: 2, price: 4540, percentage: null, status: 'REMAINING' },
    ]);
  });

  test('does not derive targets from legacy raw TP level arrays', () => {
    expect(normalizeTradeTakeProfitTargets([4530, 4540])).toEqual([]);
  });

  test('keeps unallocated TP targets separate from executable remaining targets', () => {
    const targets = normalizeTradeTakeProfitTargets([
      { level: 1, price: 4530, status: 'REMAINING' },
      { level: 2, price: 4540, status: 'NOT_ALLOCATED' },
    ]);

    expect(targets[1]?.status).toBe('NOT_ALLOCATED');
    expect(getTradeTakeProfitProgress(targets)).toMatchObject({
      totalCount: 2,
      takenCount: 0,
      remainingCount: 1,
      notAllocatedCount: 1,
    });
  });
});

describe('resolveTradeOrderRowTime', () => {
  test('uses open time for open orders', () => {
    expect(
      resolveTradeOrderRowTime({
        status: 'open',
        openTime: '2026-05-07T10:00:00.000Z',
        createdAt: '2026-05-07T09:00:00.000Z',
        closeTime: '2026-05-07T11:00:00.000Z',
      })
    ).toBe('2026-05-07T10:00:00.000Z');
  });

  test('does not fall back to created time for open orders', () => {
    expect(
      resolveTradeOrderRowTime({
        status: 'open',
        createdAt: '2026-05-07T09:00:00.000Z',
      })
    ).toBeUndefined();
  });

  test('uses created time for pending orders', () => {
    expect(
      resolveTradeOrderRowTime({
        status: 'pending',
        openTime: '2026-05-07T10:00:00.000Z',
        createdAt: '2026-05-07T09:00:00.000Z',
        updatedAt: '2026-05-07T12:00:00.000Z',
      })
    ).toBe('2026-05-07T09:00:00.000Z');
  });

  test('does not fall back to open time for pending orders', () => {
    expect(
      resolveTradeOrderRowTime({
        status: 'pending',
        openTime: '2026-05-07T10:00:00.000Z',
      })
    ).toBeUndefined();
  });

  test('uses close time for closed orders', () => {
    expect(
      resolveTradeOrderRowTime({
        status: 'closed',
        openTime: '2026-05-07T09:00:00.000Z',
        createdAt: '2026-05-07T08:00:00.000Z',
        closeTime: '2026-05-07T11:00:00.000Z',
      })
    ).toBe('2026-05-07T11:00:00.000Z');
  });

  test('does not fall back to open time for closed orders', () => {
    expect(
      resolveTradeOrderRowTime({
        status: 'closed',
        openTime: '2026-05-07T09:00:00.000Z',
      })
    ).toBeUndefined();
  });
});

describe('trade close reason labels', () => {
  test.each([
    ['TP', 2, 'TP2', { tone: 'tp', label: 'TP2' }],
    ['SL', null, 'SL', { tone: 'sl', label: 'SL' }],
    ['BREAKEVEN', null, 'Break-even', { tone: 'sl', label: 'Break-even' }],
    ['TRAILING_STOP', null, 'Trailing stop', { tone: 'sl', label: 'Trailing stop' }],
    ['MANUAL', null, 'Manual', { tone: 'manual', label: 'Manual' }],
    ['PENDING_EXPIRATION', null, 'Deleted', { tone: 'manual', label: 'Deleted' }],
  ])('formats %s', (closeReason, closeTpLevel, label, badge) => {
    expect(resolveTradeCloseReasonLabel({ closeReason, closeTpLevel })).toBe(label);
    expect(resolveTradeCloseReasonBadge({ closeReason, closeTpLevel })).toEqual(badge);
  });
});

describe('normalizeTradeOrderTimestamp', () => {
  test('keeps valid timestamp strings unchanged', () => {
    expect(normalizeTradeOrderTimestamp('2026-05-07T11:00:00.000Z')).toBe(
      '2026-05-07T11:00:00.000Z'
    );
  });

  test('normalizes timezone-less date-time strings as UTC trade timestamps', () => {
    expect(normalizeTradeOrderTimestamp('2026-05-07T11:00:00')).toBe(
      '2026-05-07T11:00:00.000Z'
    );
  });

  test('converts generated client Date values to ISO strings', () => {
    expect(normalizeTradeOrderTimestamp(new Date('2026-05-07T11:00:00.000Z'))).toBe(
      '2026-05-07T11:00:00.000Z'
    );
  });

  test('rejects invalid or empty timestamp values', () => {
    expect(normalizeTradeOrderTimestamp('')).toBeUndefined();
    expect(normalizeTradeOrderTimestamp('not-a-date')).toBeUndefined();
    expect(normalizeTradeOrderTimestamp(new Date('not-a-date'))).toBeUndefined();
    expect(normalizeTradeOrderTimestamp(null)).toBeUndefined();
  });
});

describe('trade order date-time formatting', () => {
  test('parses ISO strings as absolute instants', () => {
    expect(parseTradeOrderDate('2026-05-07T11:00:00.000Z').toISOString()).toBe(
      '2026-05-07T11:00:00.000Z'
    );
  });

  test('formats trade timestamps in the requested local timezone', () => {
    expect(
      formatTradeOrderLocalDateTime('2026-05-07T11:00:00.000Z', 'en-US', {
        timeZone: 'Europe/Istanbul',
      })
    ).toBe('May 07, 2026, 2:00 PM');
  });

  test('can keep compact channel timestamps without the year', () => {
    expect(
      formatTradeOrderLocalDateTime('2026-05-07T11:00:00.000Z', 'en-US', {
        includeYear: false,
        timeZone: 'Europe/Istanbul',
      })
    ).toBe('May 07, 2:00 PM');
  });
});
