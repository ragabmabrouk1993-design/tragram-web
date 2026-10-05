export type EconomicCalendarBootstrapQuery = {
  page: 1;
  pageSize: 200;
  from: Date;
  to: Date;
};

export const buildEconomicCalendarBootstrapQuery = (openedAt: Date): EconomicCalendarBootstrapQuery => ({
  page: 1,
  pageSize: 200,
  from: new Date(openedAt.getTime() - 86400000),
  to: new Date(openedAt.getTime() + 14 * 86400000),
});

export const toEconomicNewsRealtimeQuery = (query: EconomicCalendarBootstrapQuery) => ({
  page: query.page,
  pageSize: query.pageSize,
  from: query.from.toISOString(),
  to: query.to.toISOString(),
});
