import { redirect } from "next/navigation";
import { configured, session } from "@/infrastructure/supabase/server";
import { AppShell } from "@/components/app-shell";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!configured())
    return (
      <main
        id="main"
        style={{ maxWidth: 700, margin: "80px auto", padding: 24 }}
      >
        <div className="eyebrow">UtsavOS · Configuration required</div>
        <h1>Connect your planning workspace.</h1>
        <p className="muted">
          Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          in .env.local, then apply the tracked migrations. Secure sign-in and
          saved planning require this connection.
        </p>
        <p className="notice">
          No demonstration records are being presented as saved events. See
          docs/DEPLOYMENT.md for setup and release checks.
        </p>
        <Link className="button primary" href="/">
          Back to UtsavOS
        </Link>
      </main>
    );
  let email = "";
  try {
    email = (await session()).user.email ?? "";
  } catch {
    redirect("/login");
  }
  return (
    <AppShell
      email={email}
      teamsEnabled={process.env.FEATURE_TEAMS === "true"}
      dashboardEnabled={process.env.FEATURE_WORKSPACE_DASHBOARD === "true"}
    >
      {children}
    </AppShell>
  );
}
