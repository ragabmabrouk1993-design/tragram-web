"use client";

import styles from "./economic-calendar.module.css";

type CalendarEventCardProps = {
  event: {
    id: string;
    name: string;
    currency: string | null;
    impact: string;
    eventAt: string;
    actualText: string | null;
    forecastText: string | null;
    previousText: string | null;
    releaseStatus?: string | null;
  };
  locale: string;
  labels: { actual: string; forecast: string; previous: string; block: string };
  onBlock: () => void;
  disabled: boolean;
};

export function CalendarEventCard({ event, locale, labels, onBlock, disabled }: CalendarEventCardProps) {
  const untimed = event.releaseStatus === "tentative" || event.releaseStatus === "all-day";
  return (
    <article className={styles.eventCard}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={styles.eventName}>{event.name}</h3>
          <p className={styles.eventMeta}>
            {event.currency ?? "—"} · {untimed ? event.releaseStatus : new Date(event.eventAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <span className={`${styles.impact} ${event.impact === "HIGH" ? styles.impactHigh : event.impact === "MEDIUM" ? styles.impactMedium : event.impact === "LOW" ? styles.impactLow : styles.impactUnknown}`}>{event.impact}</span>
      </div>
      <dl className={styles.values}>
        <div><dt className={styles.valueLabel}>{labels.actual}</dt><dd className={styles.valueText}>{event.actualText ?? "—"}</dd></div>
        <div><dt className={styles.valueLabel}>{labels.forecast}</dt><dd className={styles.valueText}>{event.forecastText ?? "—"}</dd></div>
        <div><dt className={styles.valueLabel}>{labels.previous}</dt><dd className={styles.valueText}>{event.previousText ?? "—"}</dd></div>
      </dl>
      {!untimed && <button type="button" disabled={disabled} onClick={onBlock} className={`${styles.button} ${styles.buttonSecondary} mt-4 w-full`}>{labels.block}</button>}
    </article>
  );
}
