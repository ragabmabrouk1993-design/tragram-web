export type CalendarEventLike = { id: string; eventAt: string; name?: string };
export type CalendarFilters = { search: string; currencies: string[]; impacts: string[] };
export type CalendarFilterEvent = CalendarEventLike & { currency?: string | null; impact?: string; isInForexScope?: boolean; actualText?: string | null };
export type CalendarHealth = 'HEALTHY' | 'DEGRADED' | 'STALE' | string;
export type CalendarPageState = 'LOADING' | 'EMPTY' | 'FILTERED_EMPTY' | 'READY' | 'STALE_WITH_DATA' | 'UNAVAILABLE';

export function groupEventsByLocalDay<T extends CalendarEventLike>(events: T[], timeZone: string) {
  const groups = new Map<string, T[]>();
  for (const event of events) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(event.eventAt));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    const key = `${values.year}-${values.month}-${values.day}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([key, items]) => ({ key, items }));
}

export function resolveCalendarState(input: { loading: boolean; items: unknown[]; health: CalendarHealth; filtersActive: boolean; error?: boolean }): CalendarPageState {
  if (input.loading && input.items.length === 0) return 'LOADING';
  if (input.error && input.items.length === 0) return 'UNAVAILABLE';
  if (input.items.length === 0) return input.filtersActive ? 'FILTERED_EMPTY' : 'EMPTY';
  if (input.health === 'STALE' || input.health === 'DEGRADED') return 'STALE_WITH_DATA';
  return 'READY';
}

export function filterCalendarEvents<T extends CalendarFilterEvent>(events: T[], filters: CalendarFilters): T[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return events.filter((event) => {
    if (search && !`${event.name ?? ''} ${event.currency ?? ''}`.toLocaleLowerCase().includes(search)) return false;
    if (filters.currencies.length > 0 && !filters.currencies.includes(event.currency ?? '')) return false;
    if (filters.impacts.length > 0 && !filters.impacts.includes(event.impact ?? '')) return false;
    return true;
  });
}

export function findCurrentAndNext<T extends CalendarFilterEvent>(events: T[], now: Date): { current?: T; next?: T } {
  const ordered = [...events].sort((left, right) => Date.parse(left.eventAt) - Date.parse(right.eventAt));
  const current = ordered.filter((event) => Date.parse(event.eventAt) <= now.getTime() && !event.actualText).at(-1);
  const next = ordered.find((event) => Date.parse(event.eventAt) > now.getTime());
  return { current, next };
}
