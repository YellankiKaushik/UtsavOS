import { NextResponse } from "next/server";
import { createClient } from "@/infrastructure/supabase/server";
import { applicationOrigin } from "@/application/origin";
import { handle } from "@/application/http";
export async function GET(request: Request) {
  try {
    const origin = applicationOrigin(request);
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
            origin,
          ),
        );
    }
    return NextResponse.redirect(new URL("/login?error=expired_link", origin));
  } catch (error) {
    return handle(async () => {
      throw error;
    });
  }
}
