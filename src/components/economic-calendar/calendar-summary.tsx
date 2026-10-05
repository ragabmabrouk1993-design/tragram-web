import styles from "./economic-calendar.module.css";
import type { EconomicCalendarEvent } from "@/features/economic-calendar/types";

type CalendarSummaryProps = {
  current?: EconomicCalendarEvent;
  next?: EconomicCalendarEvent;
  locale: string;
  labels: { current: string; next: string; actual: string; forecast: string; previous: string; none: string; tentative: string };
};

const formatEventTime = (value: string, locale: string) => new Date(value).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });

const impactClass = (impact: string) => impact === "HIGH" ? styles.impactHigh : impact === "MEDIUM" ? styles.impactMedium : impact === "LOW" ? styles.impactLow : styles.impactUnknown;

function SummaryCard({ event, label, locale, labels }: { event?: EconomicCalendarEvent; label: string; locale: string; labels: CalendarSummaryProps["labels"] }) {
  return (
    <article className={`${styles.panel} ${styles.summaryCard}`}>
      <p className={styles.eyebrow}>{label}</p>
      {event ? (
        <div className="mt-3 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h2 className={styles.eventName}>{event.name}</h2>
            <span className={`${styles.impact} ${impactClass(event.impact)}`}>{event.impact}</span>
          </div>
          <p className={styles.eventMeta}>
            {event.currency ?? "—"} · {event.releaseStatus === "tentative" ? labels.tentative : formatEventTime(event.eventAt, locale)}
          </p>
          <dl className={styles.values}>
            <div><dt className={styles.valueLabel}>{labels.actual}</dt><dd className={styles.valueText}>{event.actualText ?? "—"}</dd></div>
            <div><dt className={styles.valueLabel}>{labels.forecast}</dt><dd className={styles.valueText}>{event.forecastText ?? "—"}</dd></div>
            <div><dt className={styles.valueLabel}>{labels.previous}</dt><dd className={styles.valueText}>{event.previousText ?? "—"}</dd></div>
          </dl>
        </div>
      ) : <p className={`${styles.muted} ${styles.small} mt-3`}>{labels.none}</p>}
    </article>
  );
}

export function CalendarSummary({ current, next, locale, labels }: CalendarSummaryProps) {
  return <section className={styles.summaryGrid} aria-label={`${labels.current} / ${labels.next}`}>
    <SummaryCard event={current} label={labels.current} locale={locale} labels={labels} />
    <SummaryCard event={next} label={labels.next} locale={locale} labels={labels} />
  </section>;
}
