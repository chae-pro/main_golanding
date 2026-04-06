export function LandingDetailFallback() {
  return (
    <main className="panel detail-panel detail-panel-compact">
      <div className="section-heading detail-heading">
        <span className="eyebrow">랜딩 상세</span>
        <h2>불러오는 중...</h2>
        <p>랜딩 정보를 준비하고 있습니다.</p>
      </div>

      <div className="detail-grid detail-grid-compact">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="detail-card" key={`detail-skeleton-${index}`}>
            <strong>...</strong>
            <p>로딩 중</p>
          </div>
        ))}
      </div>
    </main>
  );
}
