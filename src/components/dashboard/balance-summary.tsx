import { DeltaIndicator } from "@/components/dashboard/delta-indicator";

type BalanceSummaryProps = {
  label: string;
  amount: string;
  delta?: {
    amount: string;
    percent: string;
    trend: "up" | "down" | "flat";
  };
  secondary?: {
    label: string;
    amount: string;
    trend: "up" | "down" | "flat";
  };
  meta?: string;
};

export function BalanceSummary({ label, amount, delta, secondary, meta }: BalanceSummaryProps) {
  return (
    <div className="dashboard-balance">
      <p className="dashboard-balance-label">{label}</p>
      <p className="dashboard-balance-amount">{amount}</p>
      {delta && (
        <DeltaIndicator
          amount={delta.amount}
          percent={delta.percent}
          trend={delta.trend}
        />
      )}
      {secondary && (
        <p className={`dashboard-balance-secondary dashboard-delta-${secondary.trend}`}>
          <span>{secondary.label}</span>
          <strong>{secondary.amount}</strong>
        </p>
      )}
      {meta ? <p className="dashboard-balance-meta">{meta}</p> : null}
    </div>
  );
}
