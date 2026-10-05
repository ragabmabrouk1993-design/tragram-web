export default function ProfileLoading() {
  return (
    <div className="profile-mobile-shell">
      <header className="profile-mobile-header" aria-hidden="true">
        <span className="profile-mobile-header-spacer" />
        <div className="profile-mobile-title-group">
          <span className="profile-skeleton-line profile-skeleton-line-medium" />
          <span className="profile-skeleton-line profile-skeleton-line-short" />
        </div>
        <span className="profile-mobile-header-spacer" />
      </header>

      <main className="profile-mobile-body">
        <div className="profile-overview-skeleton" aria-hidden="true">
          {Array.from({ length: 2 }).map((_, sectionIndex) => (
            <div key={`profile-loading-section-${sectionIndex}`} className="profile-overview-skeleton-section">
              <span className="profile-skeleton-line profile-overview-skeleton-heading" />
              <div className="profile-overview-skeleton-list">
                {Array.from({ length: sectionIndex === 0 ? 4 : 2 }).map((__, rowIndex) => (
                  <div
                    key={`profile-loading-row-${sectionIndex}-${rowIndex}`}
                    className="profile-more-row profile-overview-skeleton-row"
                  >
                    <span className="profile-overview-skeleton-icon" />
                    <div className="profile-overview-skeleton-copy">
                      <span className="profile-skeleton-line profile-skeleton-line-medium" />
                      <span className="profile-skeleton-line profile-skeleton-line-short" />
                    </div>
                    <span className="profile-skeleton-line profile-overview-skeleton-tail" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
