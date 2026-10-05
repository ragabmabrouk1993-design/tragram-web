export default function ChannelDetailLoading() {
  return (
    <div className="channels-detail-skeleton" aria-hidden="true">
      <div className="channels-detail-header channels-detail-header-skeleton">
        <div className="channels-detail-header-skeleton-circle" />
        <div className="channels-detail-header-skeleton-meta">
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
        </div>
        <div className="channels-detail-header-skeleton-circle" />
      </div>

      <div className="channels-detail-skeleton-overview">
        <div className="channels-detail-stats channels-detail-skeleton-stats">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div
              key={`channel-loading-kpi-${idx}`}
              className="channels-detail-skeleton-card channels-detail-skeleton-kpi"
            >
              <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
              <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
            </div>
          ))}
        </div>

        <div className="channels-detail-skeleton-card channels-detail-skeleton-tabs channels-detail-skeleton-selector">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={`channel-loading-tab-${idx}`} className="channels-detail-skeleton-pill" />
          ))}
        </div>
      </div>

      <div className="channels-detail-skeleton-card channels-detail-skeleton-chart-card">
        <div className="channels-detail-chart-loading-header">
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
        </div>
        <div className="channels-detail-skeleton-chart-surface">
          <div className="channels-detail-skeleton-chart-grid" />
          <div className="channels-detail-skeleton-chart-wave" />
          <div className="channels-detail-skeleton-chart-axis-row">
            {Array.from({ length: 6 }).map((_, idx) => (
              <span
                key={`channel-loading-chart-axis-${idx}`}
                className="channels-detail-skeleton-line channels-detail-skeleton-line-axis"
              />
            ))}
          </div>
        </div>
        <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
      </div>

      <div className="channels-detail-orders channels-detail-skeleton-orders-section">
        <div className="channels-detail-orders-tabs channels-detail-skeleton-order-tabs">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`channel-loading-orders-tab-${idx}`}
              className="channels-detail-skeleton-pill"
            />
          ))}
        </div>

        <div className="channels-detail-orders-skeleton">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`channel-loading-order-${idx}`}
              className="channels-detail-skeleton-order-card"
            >
              <div className="channels-detail-skeleton-order-top">
                <div className="channels-detail-skeleton-order-identity">
                  <div className="channels-detail-header-skeleton-circle channels-detail-skeleton-order-icon" />
                  <div className="channels-detail-skeleton-order-copy">
                    <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
                    <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
                    <div className="channels-detail-skeleton-line channels-detail-skeleton-line-long" />
                  </div>
                </div>

                <div className="channels-detail-skeleton-order-summary">
                  <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
                  <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
