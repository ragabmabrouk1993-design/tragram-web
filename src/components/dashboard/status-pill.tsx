import { cn } from "@/lib/utils";

type StatusPillProps = React.HTMLAttributes<HTMLSpanElement> & {
  status?: "online" | "offline" | "warning";
};

export function StatusPill({ className, status = "offline", ...props }: StatusPillProps) {
  return (
    <span
      className={cn("dashboard-status", `dashboard-status-${status}`, className)}
      {...props}
    />
  );
}
