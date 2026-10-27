"use client";
import { useEffect, useRef, useState } from "react";
import type { RsvpView } from "@/domain/guests";

async function postRsvp(body: string, key: string) {
  const response = await fetch("/api/rsvp", {
    method: "POST",
    cache: "no-store",
    referrerPolicy: "no-referrer",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "Please wait a minute before changing your response again."
        : "This invitation is unavailable or expired. Ask your host for a new link.",
    );
  return data.data as RsvpView;
}

export function RsvpPortal() {
  const [token, setToken] = useState("");
  const [view, setView] = useState<RsvpView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const pending = useRef<{ body: string; key: string } | null>(null);
  async function request(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setSaved(false);
    const serialized = JSON.stringify(body);
    if (pending.current?.body !== serialized)
      pending.current = { body: serialized, key: crypto.randomUUID() };
    try {
      setView(await postRsvp(serialized, pending.current.key));
      pending.current = null;
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save your response.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    let active = true;
    const candidate = window.location.hash.slice(1);
    if (/^[a-f0-9]{64}$/.test(candidate)) {
      window.history.replaceState(null, "", window.location.pathname);
      void postRsvp(
        JSON.stringify({ action: "read", token: candidate }),
        crypto.randomUUID(),
      )
        .then((data) => {
          if (active) {
            setView(data);
            setToken(candidate);
          }
        })
        .catch(() => {
          if (active)
            setError(
              "This invitation is unavailable or expired. Ask your host for a new link.",
            );
        });
    }
    return () => {
      active = false;
    };
  }, []);
  if (!view)
    return (
      <>
        <h1>You’re invited.</h1>
        <p>
          Open the private link from your host, or enter your invitation code
          below.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void request({ action: "read", token });
          }}
        >
          <label htmlFor="invitation-code">Invitation code</label>
          <input
            id="invitation-code"
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
          <button className="button primary" disabled={busy}>
            Open invitation
          </button>
        </form>
        {error ? (
          <p className="notice error" role="alert">
            {error}
          </p>
        ) : null}
        {busy ? <p role="status">Opening invitation…</p> : null}
      </>
    );
  return (
    <>
      <h1>{view.eventTitle}</h1>
      <p>
        Please reply for each invited person. Your link expires{" "}
        {new Date(view.expiresAt).toLocaleString()}.
      </p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const answers = view.guests.flatMap((guest) =>
            view.scopes.flatMap((scope) => {
              const status = form.get(`${guest.id}:${scope.id ?? "event"}`);
              return status === "accepted" || status === "declined"
                ? [{ guestId: guest.id, functionId: scope.id, status }]
                : [];
            }),
          );
          if (!answers.length)
            return setError("Choose at least one attendance response.");
          if (await request({ action: "respond", token, answers }))
            setSaved(true);
        }}
      >
        {view.guests.map((guest) => (
          <fieldset key={guest.id} style={{ marginBlock: 20 }}>
            <legend>{guest.displayName}</legend>
            {view.scopes.map((scope) => (
              <label
                key={scope.id ?? "event"}
                style={{ display: "block", marginBlock: 12 }}
              >
                {scope.title}
                <select
                  aria-label={`${guest.displayName} — ${scope.title}`}
                  name={`${guest.id}:${scope.id ?? "event"}`}
                  defaultValue={
                    view.answers.find(
                      (a) =>
                        a.guestId === guest.id && a.functionId === scope.id,
                    )?.status ?? "pending"
                  }
                >
                  <option value="pending">Please choose</option>
                  <option value="accepted">Attending</option>
                  <option value="declined">Not attending</option>
                </select>
              </label>
            ))}
          </fieldset>
        ))}
        {error ? (
          <p className="notice error" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="notice" role="status">
            Your response is saved. Thank you.
          </p>
        ) : null}
        <button className="button primary" disabled={busy}>
          Save attendance response
        </button>
      </form>
    </>
  );
}
