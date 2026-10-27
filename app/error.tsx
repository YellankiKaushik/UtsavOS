"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="empty">
      <h1>Something interrupted your plan.</h1>
      <p className="muted">
        No save was confirmed. Retry, or return to your celebrations.
      </p>
      <div className="actions" style={{ justifyContent: "center" }}>
        <button className="button primary" onClick={reset}>
          Try again
        </button>
        <Link className="button" href="/app/events">
          My celebrations
        </Link>
      </div>
    </main>
  );
}
