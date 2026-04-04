export default function AppLoading() {
  return (
    <main>
      <section className="hero">
        <div className="panel hero-copy loading-panel">
          <div className="loading-line loading-line-short" />
          <div className="loading-line loading-line-title" />
          <div className="loading-line loading-line-medium" />
          <div className="loading-line loading-line-medium" />
          <div className="loading-pill" />
        </div>

        <div className="panel hero-side loading-panel">
          <div className="hero-metrics">
            {Array.from({ length: 4 }).map((_, index) => (
              <div className="metric-card loading-card" key={index}>
                <div className="loading-line loading-line-short" />
                <div className="loading-line loading-line-medium" />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel list-panel loading-panel">
        <div className="loading-line loading-line-short" />
        <div className="loading-line loading-line-title" />

        <div className="dashboard-landing-list">
          {Array.from({ length: 3 }).map((_, index) => (
            <div className="dashboard-landing-bar loading-row" key={index}>
              <div className="loading-line loading-line-medium" />
              <div className="loading-line loading-line-short" />
              <div className="loading-line loading-line-short" />
              <div className="loading-pill" />
              <div className="loading-pill" />
              <div className="loading-pill" />
              <div className="loading-pill" />
              <div className="loading-pill" />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
