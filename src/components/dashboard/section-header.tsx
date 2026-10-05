import { cn } from "@/lib/utils";

type SectionHeaderProps = {
  title: string;
  action?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ title, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("dashboard-section-header", className)}>
      <h2 className="dashboard-section-title">{title}</h2>
      {action && <div className="dashboard-section-action">{action}</div>}
    </div>
  );
}
