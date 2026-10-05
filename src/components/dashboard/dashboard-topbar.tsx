import { TragramLogo } from "@/components/ui/logo";

type DashboardTopbarProps = {
  accountId: string;
};

export function DashboardTopbar({ accountId }: DashboardTopbarProps) {
  return (
    <div className="dashboard-topbar">
      <div className="dashboard-brand">
        <TragramLogo className="h-7 w-auto" />
        <div className="dashboard-brand-copy">
          <p className="dashboard-brand-title">Tragram.</p>
          <div className="dashboard-brand-meta">
            <p className="dashboard-brand-subtitle">{accountId}</p>
            <span className="dashboard-account-caret" aria-hidden="true">
              <i className="fa-solid fa-chevron-down" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
