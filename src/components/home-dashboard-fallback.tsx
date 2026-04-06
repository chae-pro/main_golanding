export function HomeDashboardFallback() {
  return (
    <>
      <section className="hero">
        <div className="panel hero-copy">
          <span className="eyebrow">고랜딩</span>
          <h2>랜딩 제작과 성과 분석을 한 화면에서 시작하세요.</h2>
          <div className="link-row">
            <span className="primary-button primary-button-wide button-placeholder">불러오는 중</span>
          </div>
        </div>

        <div className="panel hero-side">
          <div className="hero-metrics">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="metric-card" key={`metric-skeleton-${index}`}>
                <strong>...</strong>
                <p>로딩 중</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel list-panel">
        <div className="section-heading">
          <span className="eyebrow">랜딩 목록</span>
          <h2>생성된 랜딩페이지</h2>
        </div>

        <div className="dashboard-landing-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <article className="dashboard-landing-bar dashboard-landing-bar-skeleton" key={`landing-skeleton-${index}`}>
              <div className="dashboard-landing-title-block">
                <span className="skeleton-line skeleton-line-title" />
                <span className="skeleton-line skeleton-line-sub" />
              </div>
              <span className="skeleton-line skeleton-line-small" />
              <div className="dashboard-landing-metrics">
                <span className="skeleton-line skeleton-line-small" />
                <span className="skeleton-line skeleton-line-small" />
              </div>
              <span className="ghost-button dashboard-inline-button dashboard-inline-button-center button-placeholder">로딩</span>
              <span className="ghost-button dashboard-inline-button dashboard-inline-button-center button-placeholder">로딩</span>
              <span className="ghost-button dashboard-inline-button dashboard-inline-button-center button-placeholder">로딩</span>
              <span className="primary-button dashboard-inline-button button-placeholder">로딩</span>
              <span className="dashboard-status-toggle dashboard-status-toggle-off button-placeholder">로딩</span>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
