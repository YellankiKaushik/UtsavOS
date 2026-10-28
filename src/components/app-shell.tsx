"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  Settings,
  Flower2,
  ArrowUpRight,
  LogOut,
} from "lucide-react";
import { Brand } from "./brand";
export function AppShell({
  children,
  email,
  teamsEnabled = false,
  dashboardEnabled = false,
}: {
  children: React.ReactNode;
  email: string;
  teamsEnabled?: boolean;
  dashboardEnabled?: boolean;
}) {
  const path = usePathname(),
    router = useRouter();
  async function logout() {
    const r = await fetch("/auth/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    if (r.ok) {
      router.push("/login");
      router.refresh();
    } else window.alert("Sign-out failed. Please retry.");
  }
  return (
    <>
      <aside className="sidebar">
        <Brand />
        <div className="eyebrow">Your workspace</div>
        <nav aria-label="Workspace">
          {dashboardEnabled && (
            <Link
              className={`side-link ${path === "/app/dashboard" ? "active" : ""}`}
              href="/app/dashboard"
            >
              Workspace dashboard
            </Link>
          )}
          {teamsEnabled ? (
            <Link
              className={`side-link ${path === "/app/team" ? "active" : ""}`}
              href="/app/team"
            >
              Teams & access
            </Link>
          ) : null}
          <Link
            aria-label="My celebrations"
            href="/app/events"
            className={`side-link ${path.startsWith("/app/events") ? "active" : ""}`}
          >
            <CalendarDays size={18} />
            <span className="side-label">My celebrations</span>
          </Link>
          <Link
            aria-label="Settings and account"
            href="/app/settings"
            className={`side-link ${path === "/app/settings" ? "active" : ""}`}
          >
            <Settings size={18} />
            <span className="side-label">Settings and account</span>
          </Link>
        </nav>
        <div className="side-note">
          <Flower2 size={28} />
          <h3>
            Thoughtfully planned.
            <br />
            Wholeheartedly celebrated.
          </h3>
          <p style={{ margin: 0 }}>
            A little clarity makes room for the moments that matter.
          </p>
        </div>
        <footer>UtsavOS · Personal workspace</footer>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Brand className="mobile-brand" />
          <div className="crumb">
            Personal workspace{" "}
            <span style={{ margin: "0 10px", color: "#bcc6b6" }}>/</span>{" "}
            {path.includes("settings") ? "Settings" : "Celebrations"}
          </div>
          <div className="actions">
            <Link
              className="icon-button"
              href={path === "/app/settings" ? "/app/events" : "/app/settings"}
              aria-label={
                path === "/app/settings"
                  ? "My celebrations"
                  : `${email.slice(0, 2).toUpperCase()} account settings`
              }
            >
              <span className="avatar" aria-hidden="true">
                {email.slice(0, 2).toUpperCase()}
              </span>
            </Link>
            <span className="topbar-email muted" style={{ fontSize: 11 }}>
              {email}
            </span>
            <button
              className="icon-button"
              onClick={logout}
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
            <Link
              href="/app/events"
              className="icon-button mobile-brand"
              aria-label="My celebrations"
            >
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </header>
        <main id="main" className="content">
          {children}
        </main>
      </div>
    </>
  );
}
