export default function ChannelsLoading() {
  return (
    <div className="channels-shell">
      <div className="dashboard-grid channels-grid">
        <div className="dashboard-area">
          <div className="channels-container channels-page-skeleton" aria-hidden="true">
            <div className="channels-header channels-page-skeleton-header">
              <span className="channels-page-skeleton-line channels-page-skeleton-title" />
              <span className="channels-page-skeleton-circle" />
            </div>

            <div className="channels-list channels-page-skeleton-list">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`channels-loading-row-${index}`}
                  className="channels-row channels-page-skeleton-row"
                >
                  <div className="channels-row-info">
                    <span className="channels-page-skeleton-avatar" />
                    <div className="channels-page-skeleton-copy">
                      <span className="channels-page-skeleton-line channels-page-skeleton-line-main" />
                      <span className="channels-page-skeleton-line channels-page-skeleton-line-sub" />
                      <span className="channels-page-skeleton-pill" />
                    </div>
                  </div>
                  <span className="channels-page-skeleton-toggle" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
