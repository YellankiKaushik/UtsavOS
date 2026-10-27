export default function Loading() {
  return (
    <div className="loading" role="status" aria-label="Loading your workspace">
      <div className="skeleton" />
      <p className="muted">Loading your celebration…</p>
    </div>
  );
}
