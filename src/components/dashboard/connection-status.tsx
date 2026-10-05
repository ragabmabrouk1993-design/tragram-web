import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/dashboard/status-pill";

type ConnectionStatusProps = React.HTMLAttributes<HTMLSpanElement> & {
  status?: "online" | "offline" | "warning";
};

export function ConnectionStatus({
  status = "offline",
  className,
  children,
  ...props
}: ConnectionStatusProps) {
  return (
    <StatusPill status={status} className={cn("dashboard-connection-status", className)} {...props}>
      <span className="dashboard-status-dot" aria-hidden="true" />
      {children}
    </StatusPill>
  );
}
