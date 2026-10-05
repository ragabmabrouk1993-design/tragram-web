import { cn } from "@/lib/utils";

type DeltaIndicatorProps = {
  amount: string;
  percent: string;
  trend: "up" | "down" | "flat";
};

export function DeltaIndicator({ amount, percent, trend }: DeltaIndicatorProps) {
  const iconClass =
    trend === "down"
      ? "fa-solid fa-arrow-trend-down"
      : trend === "flat"
        ? "fa-solid fa-minus"
        : "fa-solid fa-arrow-trend-up";

  return (
    <div className={cn("dashboard-delta", `dashboard-delta-${trend}`)}>
      <i className={iconClass} aria-hidden="true" />
      <span>{amount}</span>
      <span className="dashboard-delta-percent">({percent})</span>
    </div>
  );
}
