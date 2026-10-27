"use client";
import { useState } from "react";
import { Brand } from "./brand";
export function AuthForm({ recovery = false }: { recovery?: boolean }) {
  const [mode, setMode] = useState(recovery ? "update" : "login"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function submit(form: FormData) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/auth/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Authentication failed");
      if (result.data.redirect) window.location.assign(result.data.redirect);
      else setMessage(result.data.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-form">
      <Brand className="auth-mobile-brand" />
      <div className="eyebrow">Welcome to UtsavOS</div>
      <h1>
        {mode === "signup"
          ? "Make it a celebration."
          : mode === "reset"
            ? "Reset your password"
            : mode === "update"
              ? "Choose a new password"
              : "Your next celebration starts here."}
      </h1>
      <p className="muted">
        {mode === "reset"
          ? "We’ll email a secure recovery link."
          : "Sign in to your personal planning workspace."}
      </p>
      {!recovery && (
        <div className="auth-tabs">
          <button
            className={`button ${mode === "login" ? "primary" : ""}`}
            onClick={() => setMode("login")}
          >
            Sign in
          </button>
          <button
            className={`button ${mode === "signup" ? "primary" : ""}`}
            onClick={() => setMode("signup")}
          >
            Create account
          </button>
        </div>
      )}
      <form action={submit}>
        {mode !== "update" && (
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </div>
        )}
        {mode !== "reset" && (
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={8}
              maxLength={128}
            />
            <small>At least 8 characters.</small>
          </div>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div className="notice" role="status">
            {message}
          </div>
        )}
        <button
          className="button primary"
          style={{ width: "100%" }}
          disabled={busy}
        >
          {busy
            ? "Please wait…"
            : mode === "signup"
              ? "Create your workspace"
              : mode === "reset"
                ? "Send recovery link"
                : mode === "update"
                  ? "Save new password"
                  : "Sign in to UtsavOS"}
        </button>
      </form>
      {!recovery && (
        <button
          className="button ghost"
          style={{ width: "100%", marginTop: 12 }}
          onClick={() => {
            setMode(mode === "reset" ? "login" : "reset");
            setError("");
            setMessage("");
          }}
        >
          {mode === "reset" ? "Back to sign in" : "Forgot your password?"}
        </button>
      )}
      <p className="muted" style={{ fontSize: 11, marginTop: 28 }}>
        Your saved plans stay in your workspace. AI receives only the event
        details and preferences you choose to share.
      </p>
    </div>
  );
}
