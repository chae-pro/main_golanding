export default function LandingDetailLoading() {
  return (
    <main className="panel detail-panel loading-panel">
      <div className="loading-line loading-line-short" />
      <div className="loading-line loading-line-title" />
      <div className="loading-line loading-line-medium" />

      <div className="link-row">
        <div className="loading-pill" />
        <div className="loading-pill" />
        <div className="loading-pill" />
      </div>

      <div className="detail-grid detail-grid-compact">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="detail-card loading-card" key={index}>
            <div className="loading-line loading-line-short" />
            <div className="loading-line loading-line-medium" />
          </div>
        ))}
      </div>
    </main>
  );
}
