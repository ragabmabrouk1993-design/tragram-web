import type React from "react";
import { cn } from "@/lib/utils";

type ChecklistItemRowProps = {
  label: string;
  completed?: boolean;
  trailingChevron?: boolean;
  status?: string;
  onClick?: () => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
};

export function ChecklistItemRow({
  label,
  completed = false,
  trailingChevron = false,
  status,
  onClick,
  onKeyDown,
}: ChecklistItemRowProps) {
  const actionable = Boolean(onClick || trailingChevron);
  return (
    <div
      className={cn(
        "dashboard-checklist-item",
        completed && "is-complete",
        actionable && "is-actionable"
      )}
      role="listitem"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
    >
      <span
        className={cn("dashboard-checklist-checkbox", completed && "is-complete")}
        aria-hidden="true"
      />
      <div className="dashboard-checklist-copy">
        <span className="dashboard-checklist-label">{label}</span>
        {status ? <span className="dashboard-checklist-status">{status}</span> : null}
      </div>
      {trailingChevron && (
        <span className="dashboard-checklist-chevron" aria-hidden="true">
          &gt;
        </span>
      )}
    </div>
  );
}
