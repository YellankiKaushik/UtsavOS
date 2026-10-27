import "server-only";
import { supabaseFetch } from "./fetch";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DomainError } from "@/domain/errors";
import type { Database } from "@/generated/database.types";
import { supabaseConfig } from "../config";
export function configured() {
  return supabaseConfig().configured;
}
export async function createClient() {
  if (!configured())
    throw new DomainError(
      "CONFIGURATION_REQUIRED",
      "Connect a Supabase project to enable secure sign-in and persistent planning.",
      503,
    );
  const jar = await cookies();
  const { url, key } = supabaseConfig();
  return createServerClient<Database>(url!, key!, {
    global: { fetch: supabaseFetch },
    cookies: {
      getAll: () => jar.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            jar.set(name, value, {
              ...options,
              sameSite: "lax",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
            }),
          );
        } catch {
          /* Server component cookies are refreshed in proxy. */
        }
      },
    },
  });
}
export async function session() {
  const db = await createClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user)
    throw new DomainError("UNAUTHENTICATED", "Sign in to continue", 401);
  return { db, user };
}
