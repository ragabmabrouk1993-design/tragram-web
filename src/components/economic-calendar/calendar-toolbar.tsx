"use client";

import styles from "./economic-calendar.module.css";
import type { EconomicCalendarFilters } from "@/features/economic-calendar/types";

export type CalendarRange = "all" | "today" | "tomorrow" | "week";

type CalendarToolbarProps = {
  filters: EconomicCalendarFilters;
  range: CalendarRange;
  currencies: string[];
  labels: { search: string; searchPlaceholder: string; range: string; all: string; today: string; tomorrow: string; week: string; impacts: string; currencies: string; clear: string };
  onFiltersChange: (next: EconomicCalendarFilters) => void;
  onRangeChange: (range: CalendarRange) => void;
};

const toggle = (values: string[], value: string) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value];

export function CalendarToolbar({ filters, range, currencies, labels, onFiltersChange, onRangeChange }: CalendarToolbarProps) {
  const hasFilters = Boolean(filters.search || filters.currencies.length || filters.impacts.length || range !== "all");
  return (
    <div className={styles.toolbar} aria-label={labels.search}>
      <input className={styles.control} aria-label={labels.search} placeholder={labels.searchPlaceholder} value={filters.search} onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })} />
      <label className="sr-only" htmlFor="economic-calendar-range">{labels.range}</label>
      <select id="economic-calendar-range" className={styles.control} value={range} onChange={(event) => onRangeChange(event.target.value as CalendarRange)}>
        <option value="all">{labels.all}</option>
        <option value="today">{labels.today}</option>
        <option value="tomorrow">{labels.tomorrow}</option>
        <option value="week">{labels.week}</option>
      </select>
      <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} disabled={!hasFilters} onClick={() => { onFiltersChange({ search: "", currencies: [], impacts: [] }); onRangeChange("all"); }}>{labels.clear}</button>
      <div className={styles.filterChips} aria-label={`${labels.impacts}, ${labels.currencies}`}>
        <span className={`${styles.muted} ${styles.small}`}>{labels.impacts}:</span>
        {["HIGH", "MEDIUM", "LOW"].map((impact) => <button type="button" key={impact} className={`${styles.chip} ${filters.impacts.includes(impact) ? styles.chipActive : ""}`} aria-pressed={filters.impacts.includes(impact)} onClick={() => onFiltersChange({ ...filters, impacts: toggle(filters.impacts, impact) })}>{impact}</button>)}
        <span className={`${styles.muted} ${styles.small} ms-2`}>{labels.currencies}:</span>
        {currencies.map((currency) => <button type="button" key={currency} className={`${styles.chip} ${filters.currencies.includes(currency) ? styles.chipActive : ""}`} aria-pressed={filters.currencies.includes(currency)} onClick={() => onFiltersChange({ ...filters, currencies: toggle(filters.currencies, currency) })}>{currency}</button>)}
      </div>
    </div>
  );
}
