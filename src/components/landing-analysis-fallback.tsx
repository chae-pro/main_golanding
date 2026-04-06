export function LandingAnalysisFallback() {
  return (
    <main className="panel detail-panel">
      <div className="section-heading">
        <span className="eyebrow">분석</span>
        <h2>불러오는 중...</h2>
        <p>분석 데이터를 준비하고 있습니다.</p>
      </div>

      <div className="metrics-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="detail-card" key={`analysis-skeleton-${index}`}>
            <strong>...</strong>
            <p>로딩 중</p>
          </div>
        ))}
      </div>
    </main>
  );
}
