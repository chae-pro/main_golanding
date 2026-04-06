export default function EditLandingLoading() {
  return (
    <main className="panel form-panel loading-panel">
      <div className="loading-line loading-line-short" />
      <div className="loading-line loading-line-title" />
      <div className="loading-line loading-line-medium" />
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="loading-line loading-line-medium" key={index} />
      ))}
      <div className="loading-pill" />
    </main>
  );
}
