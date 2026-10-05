import { filterCalendarEvents, findCurrentAndNext, groupEventsByLocalDay, resolveCalendarState } from './calendar-state';

const events = [{ id: 'e-1', eventAt: '2026-08-02T09:00:00.000Z', name: 'CPI' }];

it('groups events by the requested local timezone', () => {
  expect(groupEventsByLocalDay(events, 'Europe/Istanbul')[0].key).toBe('2026-08-02');
});

it('distinguishes filtered empty and stale cached states', () => {
  expect(resolveCalendarState({ loading: false, items: [], health: 'HEALTHY', filtersActive: true })).toBe('FILTERED_EMPTY');
  expect(resolveCalendarState({ loading: false, items: events, health: 'STALE', filtersActive: false })).toBe('STALE_WITH_DATA');
});

it('filters by search, currency, and impact without changing the source list', () => {
  const source = [
    { id: 'cpi', name: 'CPI m/m', eventAt: '2026-08-02T10:00:00.000Z', currency: 'USD', impact: 'HIGH', isInForexScope: true },
    { id: 'rate', name: 'Rate decision', eventAt: '2026-08-02T12:00:00.000Z', currency: 'GBP', impact: 'MEDIUM', isInForexScope: true },
  ];

  expect(filterCalendarEvents(source, { search: 'cpi', currencies: ['USD'], impacts: ['HIGH'] })).toEqual([source[0]]);
  expect(source).toHaveLength(2);
});

it('returns the unresolved current event and the next scheduled event', () => {
  const source = [
    { id: 'released', name: 'Released', eventAt: '2026-08-02T09:00:00.000Z', actualText: '1.0%' },
    { id: 'active', name: 'Active', eventAt: '2026-08-02T10:00:00.000Z', actualText: null },
    { id: 'next', name: 'Next', eventAt: '2026-08-02T12:00:00.000Z', actualText: null },
  ];

  expect(findCurrentAndNext(source, new Date('2026-08-02T10:30:00.000Z'))).toMatchObject({ current: source[1], next: source[2] });
});
