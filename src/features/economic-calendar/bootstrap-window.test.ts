import { buildEconomicCalendarBootstrapQuery, toEconomicNewsRealtimeQuery } from './bootstrap-window';

it('anchors one bounded bootstrap window per page open', () => {
  const query = buildEconomicCalendarBootstrapQuery(new Date('2026-08-02T12:00:00Z'));
  expect(query).toEqual({ page: 1, pageSize: 200, from: new Date('2026-08-01T12:00:00Z'), to: new Date('2026-08-16T12:00:00Z') });
  expect(toEconomicNewsRealtimeQuery(query)).toEqual({ page: 1, pageSize: 200, from: '2026-08-01T12:00:00.000Z', to: '2026-08-16T12:00:00.000Z' });
});
