import { GlassCard } from "@/components/dashboard/glass-card";
import { ConnectionStatus } from "@/components/dashboard/connection-status";
import { Button } from "@/components/ui/button";

const iconMap: Record<string, string> = {
  "MT5/MT4": "fa-solid fa-chart-line",
  Telegram: "fa-brands fa-telegram",
  Actions: "fa-solid fa-bolt",
  "تيليجرام": "fa-brands fa-telegram",
  "الإجراءات": "fa-solid fa-bolt",
};

type IntegrationCardProps = {
  name: string;
  status: string;
  connected: boolean;
  actionLabel: string;
  connectedLabel: string;
  onActionClick?: () => void;
};

export function IntegrationCard({
  name,
  status,
  connected,
  actionLabel,
  connectedLabel,
  onActionClick,
}: IntegrationCardProps) {
  const iconClass = iconMap[name] ?? "fa-solid fa-plug";

  return (
    <GlassCard className="dashboard-integration-card">
      <div className="dashboard-integration-header">
        <div className="dashboard-integration-icon">
          <i className={iconClass} aria-hidden="true" />
        </div>
        {connected ? (
          <Button variant="outline" size="sm" className="dashboard-connect-button is-disabled" disabled>
            {connectedLabel}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="dashboard-connect-button"
            onClick={onActionClick}
          >
            {actionLabel}
          </Button>
        )}
      </div>
      <div className="dashboard-integration-body">
        <p className="dashboard-integration-name">{name}</p>
        <div className="dashboard-integration-status">
          <ConnectionStatus status={connected ? "online" : "offline"}>{status}</ConnectionStatus>
        </div>
      </div>
    </GlassCard>
  );
}
