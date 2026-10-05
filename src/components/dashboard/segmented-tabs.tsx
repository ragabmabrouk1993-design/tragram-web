import { cn } from "@/lib/utils";

type SegmentedTab = { id: string; label: string };

type SegmentedTabsProps = {
  tabs: SegmentedTab[];
  active: string;
  onChange: (value: string) => void;
  counts?: Record<string, number>;
  ariaLabel?: string;
};

export function SegmentedTabs({ tabs, active, onChange, counts, ariaLabel = "Tabs" }: SegmentedTabsProps) {
  return (
    <div className="dashboard-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          className={cn("dashboard-tab", tab.id === active && "is-active")}
          onClick={() => {
            if (tab.id !== active) {
              onChange(tab.id);
            }
          }}
        >
          {tab.label}
          {typeof counts?.[tab.id] === "number" && (
            <span className="dashboard-tab-count">{counts[tab.id]}</span>
          )}
        </button>
      ))}
    </div>
  );
}
