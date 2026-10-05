export default function ChannelSettingsLoading() {
  return (
    <div className="channels-settings-skeleton" aria-hidden="true">
      <div className="channels-settings-skeleton-header">
        <div className="channels-detail-header-skeleton-circle" />
        <div className="channels-settings-skeleton-title">
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
          <div className="channels-settings-skeleton-channel">
            <div className="channels-detail-header-skeleton-circle channels-settings-skeleton-channel-avatar" />
            <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
          </div>
        </div>
        <div className="channels-detail-header-skeleton-circle is-transparent" />
      </div>

      <div className="channels-settings-grid">
        <div className="channels-settings-section channels-settings-section-skeleton is-full">
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
          <div className="channels-settings-skeleton-subsection">
            <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
            <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
            <div className="channels-settings-skeleton-pills">
              {Array.from({ length: 6 }).map((_, idx) => (
                <span
                  key={`channel-settings-loading-symbol-${idx}`}
                  className="channels-detail-skeleton-pill"
                />
              ))}
            </div>
          </div>
          <div className="channels-settings-skeleton-subsection">
            <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
            <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
            <div className="channels-settings-skeleton-stepper" />
            <div className="channels-settings-skeleton-stepper" />
          </div>
        </div>

        <div className="channels-settings-section channels-settings-section-skeleton channels-settings-section-skeleton-half">
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
          <div className="channels-settings-skeleton-subsection">
            <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
            <div className="channels-settings-skeleton-input" />
          </div>
          <div className="channels-settings-skeleton-subsection">
            <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
            <div className="channels-settings-skeleton-input" />
          </div>
          <div className="channels-settings-skeleton-input" />
          <div className="channels-settings-skeleton-pills">
            {Array.from({ length: 3 }).map((_, idx) => (
              <span
                key={`channel-settings-loading-risk-${idx}`}
                className="channels-detail-skeleton-pill"
              />
            ))}
          </div>
        </div>

        <div className="channels-settings-section channels-settings-section-skeleton channels-settings-section-skeleton-half">
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
          <div className="channels-settings-skeleton-pills">
            {Array.from({ length: 3 }).map((_, idx) => (
              <span
                key={`channel-settings-loading-tolerance-${idx}`}
                className="channels-detail-skeleton-pill"
              />
            ))}
          </div>
          <div className="channels-settings-skeleton-input" />
          <div className="channels-settings-skeleton-pills">
            {Array.from({ length: 2 }).map((_, idx) => (
              <span
                key={`channel-settings-loading-policy-${idx}`}
                className="channels-detail-skeleton-pill"
              />
            ))}
          </div>
          <div className="channels-settings-skeleton-input" />
          <div className="channels-settings-skeleton-stepper" />
        </div>

        <div className="channels-settings-section channels-settings-section-skeleton is-full">
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-short" />
          <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={`channel-settings-loading-management-${idx}`}
              className="channels-settings-skeleton-subsection"
            >
              <div className="channels-detail-skeleton-line channels-detail-skeleton-line-medium" />
              <div className="channels-detail-skeleton-line channels-detail-skeleton-line-wide" />
              <div className="channels-settings-skeleton-pills">
                {Array.from({ length: idx === 2 ? 4 : 3 }).map((__, pillIdx) => (
                  <span
                    key={`channel-settings-loading-management-${idx}-${pillIdx}`}
                    className="channels-detail-skeleton-pill"
                  />
                ))}
              </div>
              <div className="channels-settings-skeleton-input" />
            </div>
          ))}
        </div>
      </div>

      <div className="channels-settings-skeleton-footer">
        <div className="channels-settings-skeleton-save" />
      </div>
    </div>
  );
}
