import { GlassCard } from "@/components/dashboard/glass-card";

export default function ReportsLoading() {
  return (
    <div className="reports-page reports-page-skeleton" aria-hidden="true">
      <div className="reports-hero reports-hero-skeleton">
        <span className="reports-page-skeleton-circle is-muted" />
        <span className="reports-page-skeleton-line reports-page-skeleton-title" />
        <span className="reports-page-skeleton-circle" />
      </div>

      <div className="reports-tabs reports-tabs-skeleton">
        {Array.from({ length: 3 }).map((_, index) => (
          <span key={`reports-loading-tab-${index}`} className="reports-page-skeleton-tab" />
        ))}
      </div>

      <div className="reports-stack">
        <GlassCard className="reports-card reports-page-skeleton-card">
          <div className="reports-card-header">
            <div className="reports-page-skeleton-copy">
              <span className="reports-page-skeleton-line reports-page-skeleton-line-short" />
              <span className="reports-page-skeleton-line reports-page-skeleton-line-medium" />
            </div>
            <div className="reports-card-actions">
              <span className="reports-page-skeleton-circle reports-page-skeleton-circle-sm" />
              <span className="reports-page-skeleton-circle reports-page-skeleton-circle-sm" />
            </div>
          </div>

          <div className="reports-profit-row">
            <span className="reports-page-skeleton-pill" />
            <span className="reports-page-skeleton-pill reports-page-skeleton-pill-short" />
          </div>
          <span className="reports-page-skeleton-line reports-page-skeleton-amount" />
          <div className="reports-line-chart">
            <div className="reports-chart-skeleton">
              <div className="reports-skeleton-line" />
              <div className="reports-skeleton-line short" />
            </div>
          </div>
        </GlassCard>

        <div className="reports-compare-grid">
          <GlassCard className="reports-card reports-page-skeleton-card">
            <span className="reports-page-skeleton-line reports-page-skeleton-section-title" />
            <div className="reports-page-skeleton-bars">
              <div className="reports-bars-skeleton">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`reports-loading-bars-${index}`} className="reports-bar-skeleton" />
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="reports-card reports-page-skeleton-card">
            <span className="reports-page-skeleton-line reports-page-skeleton-section-title" />
            <div className="reports-table-skeleton">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`reports-loading-table-${index}`} className="reports-table-row-skeleton" />
              ))}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="reports-card reports-page-skeleton-card">
          <span className="reports-page-skeleton-line reports-page-skeleton-section-title" />
          <div className="reports-history-skeleton">
            <div className="reports-history-date-skeleton" />
            <div className="reports-history-card-skeleton" />
            <div className="reports-history-card-skeleton" />
            <div className="reports-history-card-skeleton is-desktop" />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
