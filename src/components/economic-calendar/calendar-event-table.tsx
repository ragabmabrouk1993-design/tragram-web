import styles from "./economic-calendar.module.css";
import { groupEventsByLocalDay } from "@/features/economic-calendar/calendar-state";
import type { EconomicCalendarEvent } from "@/features/economic-calendar/types";

type CalendarEventTableProps = {
  events: EconomicCalendarEvent[];
  locale: string;
  timeZone: string;
  labels: { event: string; currency: string; impact: string; time: string; values: string; block: string; noEvents: string };
  onBlock: (event: EconomicCalendarEvent) => void;
  savingId: string | null;
};

const formatDate = (key: string, locale: string) => new Date(`${key}T12:00:00.000Z`).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });
const formatTime = (event: EconomicCalendarEvent, locale: string) => event.releaseStatus === "tentative" || event.releaseStatus === "all-day" ? event.releaseStatus : new Date(event.eventAt).toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
const impactClass = (impact: string) => impact === "HIGH" ? styles.impactHigh : impact === "MEDIUM" ? styles.impactMedium : impact === "LOW" ? styles.impactLow : styles.impactUnknown;

export function CalendarEventTable({ events, locale, timeZone, labels, onBlock, savingId }: CalendarEventTableProps) {
  const groups = groupEventsByLocalDay(events, timeZone);
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className="sr-only">{labels.event}</caption>
        <thead><tr><th>{labels.time}</th><th>{labels.currency}</th><th>{labels.impact}</th><th>{labels.event}</th><th>{labels.values}</th><th><span className="sr-only">{labels.block}</span></th></tr></thead>
        <tbody>
          {groups.flatMap((group) => [
            <tr key={`${group.key}-day`} className={styles.tableDay}><td colSpan={6}>{formatDate(group.key, locale)}</td></tr>,
            ...group.items.map((event) => <tr key={event.id}>
              <td className={styles.muted}><time dateTime={event.eventAt}>{formatTime(event, locale)}</time></td>
              <td className="font-semibold">{event.currency ?? "—"}</td>
              <td><span className={`${styles.impact} ${impactClass(event.impact)}`}>{event.impact}</span></td>
              <td><span className="font-semibold">{event.name}</span>{event.releaseStatus && event.releaseStatus !== "tentative" && <span className={`${styles.muted} ms-2 text-xs`}> · {event.releaseStatus}</span>}</td>
              <td className={`${styles.muted} text-xs`}>A {event.actualText ?? "—"} · F {event.forecastText ?? "—"} · P {event.previousText ?? "—"}</td>
              <td className="text-end">{event.releaseStatus !== "tentative" && event.releaseStatus !== "all-day" && <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} disabled={savingId === `event:${event.id}`} onClick={() => onBlock(event)}>{labels.block}</button>}</td>
            </tr>),
          ])}
          {groups.length === 0 && <tr><td colSpan={6} className={styles.emptyState}>{labels.noEvents}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
