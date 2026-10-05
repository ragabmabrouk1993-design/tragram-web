import { GlassCard } from "@/components/dashboard/glass-card";
import { cn } from "@/lib/utils";

type DashboardSkeletonProps = {
  className?: string;
  showChecklist?: boolean;
};

export function DashboardSkeleton({
  className,
  showChecklist = true,
}: DashboardSkeletonProps) {
  const connectionCards = Array.from({ length: 2 });
  const checklistRows = Array.from({ length: 4 });
  const orderGroups = [2, 1];

  return (
    <div className={cn("dashboard-page-skeleton", className)} aria-hidden="true">
      <div className="dashboard-top-row dashboard-page-skeleton-top">
        <div className="dashboard-page-skeleton-greeting">
          <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-title" />
          <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-subtitle" />
        </div>
        <div className="dashboard-top-actions dashboard-page-skeleton-actions">
          <span className="dashboard-page-skeleton-pill" />
          <span className="dashboard-page-skeleton-circle" />
        </div>
      </div>

      <div className="dashboard-chip-row dashboard-page-skeleton-chips">
        {Array.from({ length: 3 }).map((_, index) => (
          <span key={`dashboard-chip-skeleton-${index}`} className="dashboard-page-skeleton-chip" />
        ))}
      </div>

      <div className="dashboard-balance dashboard-page-skeleton-balance">
        <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-balance-label" />
        <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-balance-amount" />
        <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-balance-delta" />
      </div>

      <div
        className={cn("dashboard-grid", !showChecklist && "dashboard-grid--no-checklist")}
      >
        <section className="dashboard-area dashboard-area-connections">
          <div className="dashboard-section-header">
            <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-section" />
            <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-link" />
          </div>
          <div className="dashboard-scroller dashboard-page-skeleton-scroller">
            {connectionCards.map((_, index) => (
              <GlassCard
                key={`dashboard-connection-skeleton-${index}`}
                className="dashboard-integration-card dashboard-page-skeleton-card"
              >
                <div className="dashboard-page-skeleton-connection">
                  <span className="dashboard-page-skeleton-avatar" />
                  <div className="dashboard-page-skeleton-connection-copy">
                    <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-short" />
                    <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-tiny" />
                  </div>
                </div>
                <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-medium" />
                <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-short" />
              </GlassCard>
            ))}
          </div>
        </section>

        {showChecklist ? (
          <section className="dashboard-area dashboard-area-checklist">
            <GlassCard className="dashboard-checklist dashboard-page-skeleton-card">
              <div className="dashboard-checklist-header">
                <div className="dashboard-page-skeleton-copy">
                  <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-section" />
                  <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-medium" />
                </div>
                <div className="dashboard-progress">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <span
                      key={`dashboard-checklist-dot-skeleton-${index}`}
                      className="dashboard-page-skeleton-dot"
                    />
                  ))}
                </div>
              </div>

              <div className="dashboard-checklist-items dashboard-page-skeleton-checklist">
                {checklistRows.map((_, index) => (
                  <div
                    key={`dashboard-checklist-row-skeleton-${index}`}
                    className="dashboard-checklist-item"
                  >
                    <span className="dashboard-page-skeleton-check" />
                    <div className="dashboard-page-skeleton-copy">
                      <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-medium" />
                      <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-tiny" />
                    </div>
                    <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-chevron" />
                  </div>
                ))}
              </div>
            </GlassCard>
          </section>
        ) : null}

        <section className="dashboard-area dashboard-area-orders">
          <GlassCard className="dashboard-orders dashboard-page-skeleton-card">
            <div className="dashboard-section-header">
              <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-section" />
            </div>
            <div className="dashboard-tabs dashboard-page-skeleton-tabs">
              {Array.from({ length: 3 }).map((_, index) => (
                <span
                  key={`dashboard-order-tab-skeleton-${index}`}
                  className="dashboard-page-skeleton-tab"
                />
              ))}
            </div>

            <div className="dashboard-orders-groups dashboard-page-skeleton-orders">
              {orderGroups.map((rows, groupIndex) => (
                <div
                  key={`dashboard-order-group-skeleton-${groupIndex}`}
                  className="dashboard-order-group"
                >
                  <div className="dashboard-order-group-header">
                    <div className="dashboard-order-group-main">
                      <span className="dashboard-page-skeleton-avatar dashboard-page-skeleton-avatar-small" />
                      <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-group-title" />
                    </div>
                    <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-group-pnl" />
                  </div>

                  {Array.from({ length: rows }).map((__, rowIndex) => (
                    <div
                      key={`dashboard-order-row-skeleton-${groupIndex}-${rowIndex}`}
                      className="dashboard-order-row dashboard-page-skeleton-order-row"
                    >
                      <div className="dashboard-order-info">
                        <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-medium" />
                        <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-short" />
                      </div>
                      <div className="dashboard-order-summary">
                        <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-short" />
                        <span className="dashboard-page-skeleton-line dashboard-page-skeleton-line-tiny" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </GlassCard>
        </section>
      </div>
    </div>
  );
}
