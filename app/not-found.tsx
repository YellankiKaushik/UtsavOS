import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="empty">
      <h1>This page isn’t on the plan.</h1>
      <p className="muted">
        The page may have moved, or this event may be outside your workspace.
      </p>
      <Link className="button primary" href="/app/events">
        Back to celebrations
      </Link>
    </main>
  );
}
