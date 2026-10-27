"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, RefreshCw } from "lucide-react";
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public requestId: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const r = await fetch(`/api/v1/${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
    cache: "no-store",
  });
  const result = await r.json();
  if (!r.ok)
    throw new ApiError(
      result.error?.message ?? "The request failed",
      result.error?.code ?? "UNKNOWN",
      result.error?.requestId ?? "",
      r.status,
    );
  return result.data as T;
}
export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<Error | null>(null),
    [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await api<T>(path));
    } catch (e) {
      setError(e instanceof Error ? e : new Error("Connection failed"));
    } finally {
      setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    let active = true;
    api<T>(path)
      .then((d) => {
        if (active) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path]);
  return { data, error, loading, reload, setData };
}
export function useMutation() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null),
    [message, setMessage] = useState("");
  const pending = useRef<{ signature: string; key: string } | null>(null),
    controller = useRef<AbortController | null>(null),
    inFlight = useRef(false);
  async function mutate<T>(
    path: string,
    body: unknown,
    method = "POST",
  ): Promise<T | null> {
    if (inFlight.current) return null;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setMessage("");
    const signature = JSON.stringify({ path, body, method });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    controller.current = new AbortController();
    const timeout = setTimeout(
      () => controller.current?.abort("deadline"),
      55000,
    );
    try {
      const data = await api<T>(path, {
        method,
        body: JSON.stringify(body),
        headers: { "Idempotency-Key": pending.current.key },
        signal: controller.current.signal,
      });
      pending.current = null;
      return data;
    } catch (e) {
      if (
        e instanceof ApiError &&
        !["DB_UNAVAILABLE", "INTERNAL_ERROR"].includes(e.code)
      )
        pending.current = null;
      setError(
        controller.current?.signal.aborted
          ? new Error(
              "Stopped waiting. The server may still complete the request. Reload saved drafts before starting another generation.",
            )
          : e instanceof Error
            ? e
            : new Error("Network unavailable. No save was confirmed."),
      );
      return null;
    } finally {
      clearTimeout(timeout);
      inFlight.current = false;
      setBusy(false);
    }
  }
  function cancel() {
    controller.current?.abort();
    setError(
      new Error(
        "Stopped waiting. The server may still complete the request. Reload saved drafts before starting another generation.",
      ),
    );
  }
  return { mutate, busy, error, setError, message, setMessage, cancel };
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: Error | null;
  retry?: () => void;
}) {
  if (!error) return null;
  return (
    <div className="notice error" role="alert">
      <strong>
        {error instanceof ApiError
          ? error.code.replaceAll("_", " ")
          : "Unable to continue"}
      </strong>
      <p>{error.message}</p>
      {error instanceof ApiError && error.requestId && (
        <small>Reference: {error.requestId}</small>
      )}
      {retry && (
        <div style={{ marginTop: 12 }}>
          <button className="button" onClick={retry}>
            <RefreshCw size={14} />
            Reload current data
          </button>
        </div>
      )}
    </div>
  );
}
export function Loading() {
  return (
    <div role="status" aria-live="polite">
      <div className="eyebrow">Your planning workspace</div>
      <div className="skeleton" />
      <p className="muted" style={{ marginTop: 16 }}>
        Loading saved details…
      </p>
    </div>
  );
}
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
export function Modal({
  title,
  description,
  children,
  open,
  onOpenChange,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const opener = useRef<HTMLElement | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content"
          onOpenAutoFocus={() => {
            opener.current =
              document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
        >
          <Dialog.Title className="dialog-title">{title}</Dialog.Title>
          <Dialog.Description
            className="muted"
            style={{ fontSize: 12, marginBottom: 24 }}
          >
            {description}
          </Dialog.Description>
          <Dialog.Close
            className="icon-button dialog-close"
            aria-label="Close dialog"
          >
            <X size={17} />
          </Dialog.Close>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Field({
  label,
  id,
  hint,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small id={`${id}-hint`}>{hint}</small>}
    </div>
  );
}
export function Empty({
  title,
  text,
  onAdd,
  label = "Add your first item",
}: {
  title: string;
  text: string;
  onAdd?: () => void;
  label?: string;
}) {
  return (
    <div className="card empty">
      <Plus size={28} />
      <h2>{title}</h2>
      <p className="muted">{text}</p>
      {onAdd && (
        <button className="button primary" onClick={onAdd}>
          <Plus size={16} />
          {label}
        </button>
      )}
    </div>
  );
}
export function dateLabel(value: string | null, timeZone: string) {
  return value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone,
      }).format(new Date(value))
    : "Date to be decided";
}
export function localDateValue(value: string | null, timeZone: string) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
