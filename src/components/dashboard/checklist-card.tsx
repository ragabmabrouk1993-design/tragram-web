import { GlassCard } from "@/components/dashboard/glass-card";
import { ProgressDots } from "@/components/dashboard/progress-dots";

type ChecklistCardProps = {
  title: string;
  subtitle?: string;
  total: number;
  completed: number;
  children: React.ReactNode;
};

export function ChecklistCard({ title, subtitle, total, completed, children }: ChecklistCardProps) {
  return (
    <GlassCard className="dashboard-checklist dashboard-checklist-modern">
      <div className="dashboard-checklist-header">
        <div>
          <h3 className="dashboard-card-title">{title}</h3>
          {subtitle && <p className="dashboard-card-subtitle">{subtitle}</p>}
        </div>
        <ProgressDots total={total} current={completed} />
      </div>
      <div className="dashboard-checklist-body">
        <div className="dashboard-checklist-items" role="list">
          {children}
        </div>
      </div>
    </GlassCard>
  );
}
