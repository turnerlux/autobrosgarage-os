export default function Loading() {
  return (
    <main className="error-screen" aria-live="polite" aria-busy="true">
      <div className="loading-panel" role="status">
        <span className="loading-mark" aria-hidden="true">
          ✦
        </span>
        <span>Organizing shop records…</span>
      </div>
    </main>
  );
}
