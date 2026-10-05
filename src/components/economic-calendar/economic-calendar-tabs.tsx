"use client";

import { useRef } from "react";
import styles from "./economic-calendar.module.css";

type EconomicCalendarTab = "calendar" | "protection";

export function EconomicCalendarTabs({ active, onChange, labels }: { active: EconomicCalendarTab; onChange: (tab: EconomicCalendarTab) => void; labels: { calendar: string; protection: string; listLabel: string } }) {
  const tabs = ["calendar", "protection"] as const;
  const tabRefs = useRef<Partial<Record<EconomicCalendarTab, HTMLButtonElement>>>({});
  const activate = (tab: EconomicCalendarTab) => {
    onChange(tab);
    window.requestAnimationFrame(() => tabRefs.current[tab]?.focus());
  };
  const move = (current: EconomicCalendarTab, direction: 1 | -1 | 0) => {
    if (direction === 0) return tabs[0];
    const index = tabs.indexOf(current);
    return tabs[(index + direction + tabs.length) % tabs.length];
  };

  return (
    <div className={styles.tabs} role="tablist" aria-label={labels.listLabel}>
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          id={`economic-calendar-tab-${tab}`}
          aria-controls={`economic-calendar-panel-${tab}`}
          aria-selected={active === tab}
          tabIndex={active === tab ? 0 : -1}
          ref={(element) => { if (element) tabRefs.current[tab] = element; }}
          onClick={() => activate(tab)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") { event.preventDefault(); activate(move(tab, 1)); }
            if (event.key === "ArrowLeft") { event.preventDefault(); activate(move(tab, -1)); }
            if (event.key === "Home") { event.preventDefault(); activate(move(tab, 0)); }
            if (event.key === "End") { event.preventDefault(); activate(tabs[tabs.length - 1]); }
          }}
          className={`${styles.tab} ${active === tab ? styles.tabActive : ""}`}
        >
          {tab === "calendar" ? labels.calendar : labels.protection}
        </button>
      ))}
    </div>
  );
}
