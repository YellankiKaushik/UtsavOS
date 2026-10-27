import { createServerClient } from "@supabase/ssr";
import { supabaseFetch } from "@/infrastructure/supabase/fetch";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/infrastructure/config";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  response.headers.set("Cache-Control", "private, no-store");
  const { url, key } = supabaseConfig();
  if (!url || !key) return response;
  const db = createServerClient(url, key, {
    global: { fetch: supabaseFetch },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, {
            ...options,
            sameSite: "lax",
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
          }),
        );
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  await db.auth.getUser();
  return response;
}
export const config = {
  matcher: ["/app/:path*", "/onboarding", "/api/v1/:path*"],
};
