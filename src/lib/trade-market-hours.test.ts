import {
  getTradeMarketHoursTransitionMs,
  isTradeActionBlockedByMarketHours,
  normalizeTradeMarketHours,
  resolveEffectiveTradeMarketHours,
} from './trade-market-hours';

describe('trade-market-hours', () => {
  it('normalizes backend market-hours payloads', () => {
    expect(
      normalizeTradeMarketHours({
        isTradeSessionOpen: false,
        reasonCode: 'TRADE_SESSION_CLOSED',
        reasonMessage: 'Market is closed for trading.',
        nextOpenAt: '2026-04-14T06:00:00.000Z',
        nextCloseAt: '2026-04-14T18:00:00.000Z',
        checkedAt: '2026-04-13T20:00:00.000Z',
        source: 'MT5_SYMBOL_SESSIONS',
      })
    ).toMatchObject({
      isTradeSessionOpen: false,
      reasonCode: 'TRADE_SESSION_CLOSED',
      source: 'MT5_SYMBOL_SESSIONS',
    });
  });

  it('locally flips closed orders to open after nextOpenAt', () => {
    const marketHours = normalizeTradeMarketHours({
      isTradeSessionOpen: false,
      reasonCode: 'TRADE_SESSION_CLOSED',
      reasonMessage: 'Market is closed for trading.',
      nextOpenAt: '2026-04-14T06:00:00.000Z',
      nextCloseAt: '2026-04-14T18:00:00.000Z',
      checkedAt: '2026-04-13T20:00:00.000Z',
      source: 'MT5_SYMBOL_SESSIONS',
    });

    const effective = resolveEffectiveTradeMarketHours(
      marketHours,
      Date.parse('2026-04-14T07:00:00.000Z')
    );

    expect(effective).toMatchObject({
      isTradeSessionOpen: true,
      reasonCode: 'TRADE_SESSION_OPEN',
      reasonMessage: null,
    });
    expect(
      isTradeActionBlockedByMarketHours(effective, Date.parse('2026-04-14T07:00:00.000Z'))
    ).toBe(false);
  });

  it('does not block actions when market hours are absent from a compact realtime row', () => {
    expect(isTradeActionBlockedByMarketHours(undefined)).toBe(false);
  });

  it('returns the next transition timestamp for local re-render scheduling', () => {
    const marketHours = normalizeTradeMarketHours({
      isTradeSessionOpen: true,
      reasonCode: 'TRADE_SESSION_OPEN',
      reasonMessage: null,
      nextOpenAt: '2026-04-15T06:00:00.000Z',
      nextCloseAt: '2026-04-14T18:00:00.000Z',
      checkedAt: '2026-04-14T07:00:00.000Z',
      source: 'MT5_SYMBOL_SESSIONS',
    });

    expect(
      getTradeMarketHoursTransitionMs(marketHours, Date.parse('2026-04-14T07:30:00.000Z'))
    ).toBe(Date.parse('2026-04-14T18:00:00.000Z'));
  });
});
