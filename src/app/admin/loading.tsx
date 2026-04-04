export default function AdminLoading() {
  return (
    <main className="admin-stack">
      {Array.from({ length: 3 }).map((_, sectionIndex) => (
        <section className="panel list-panel loading-panel" key={sectionIndex}>
          <div className="loading-line loading-line-short" />
          <div className="loading-line loading-line-title" />

          <div className="admin-line-list">
            {Array.from({ length: 3 }).map((__, rowIndex) => (
              <div className="admin-line-row loading-row" key={rowIndex}>
                <div className="loading-line loading-line-medium" />
                <div className="loading-line loading-line-short" />
                <div className="loading-line loading-line-short" />
                <div className="loading-line loading-line-short" />
                <div className="loading-pill" />
                <div className="loading-pill" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
