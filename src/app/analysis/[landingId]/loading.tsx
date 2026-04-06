export default function AnalysisLoading() {
  return (
    <main className="panel detail-panel loading-panel">
      <div className="loading-line loading-line-short" />
      <div className="loading-line loading-line-title" />
      <div className="loading-line loading-line-medium" />

      <div className="metrics-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="detail-card loading-card" key={index}>
            <div className="loading-line loading-line-short" />
            <div className="loading-line loading-line-medium" />
          </div>
        ))}
      </div>
    </main>
  );
}
