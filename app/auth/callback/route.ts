import { NextResponse } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get("code");
  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(
        new URL(
          url.searchParams.get("next") === "/reset-password"
            ? "/reset-password"
            : "/onboarding",
          url.origin,
        ),
      );
  }
  return NextResponse.redirect(
    new URL("/login?error=expired_link", url.origin),
  );
}
