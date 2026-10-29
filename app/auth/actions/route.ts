import { z } from "zod";
import { createClient } from "@/infrastructure/supabase/server";
import { checkOrigin, handle, readBody } from "@/application/http";
import { DomainError } from "@/domain/errors";
import { applicationOrigin } from "@/application/origin";
export async function POST(request: Request) {
  return handle(async () => {
    checkOrigin(request);
    const input = z
      .object({
        action: z.enum([
          "login",
          "signup",
          "reset",
          "update",
          "logout",
          "profile",
        ]),
        email: z.string().email().nullable().optional(),
        password: z.string().min(8).max(128).nullable().optional(),
        displayName: z.string().trim().min(1).max(80).optional(),
      })
      .strict()
      .parse(await readBody(request));
    const db = await createClient();
    if (input.action === "logout") {
      const { error } = await db.auth.signOut();
      if (error)
        throw new DomainError(
          "AUTH_ERROR",
          "Sign-out failed. Please retry.",
          503,
        );
      return { redirect: "/login" };
    }
    if (input.action === "profile") {
      const displayName = z
        .string()
        .trim()
        .min(1)
        .max(80)
        .parse(input.displayName);
      const {
        data: { user },
      } = await db.auth.getUser();
      if (!user) throw new DomainError("UNAUTHENTICATED", "Sign in first", 401);
      const { error } = await db.auth.updateUser({
        data: { display_name: displayName },
      });
      if (error)
        throw new DomainError("AUTH_ERROR", "Profile could not be saved", 400);
      return { message: "Profile saved" };
    }
    if (input.action === "update") {
      const password = z.string().min(8).max(128).parse(input.password);
      const { error } = await db.auth.updateUser({ password });
      if (error)
        throw new DomainError(
          "AUTH_ERROR",
          "Recovery session expired. Request a new link.",
          400,
        );
      return { redirect: "/app/events" };
    }
    const email = z.email().parse(input.email),
      base = applicationOrigin(request);
    if (input.action === "reset") {
      const { error } = await db.auth.resetPasswordForEmail(email, {
        redirectTo: `${base}/auth/callback?next=/reset-password`,
      });
      if (error)
        throw new DomainError(
          "AUTH_ERROR",
          "Recovery request could not be completed. Please retry later.",
          503,
        );
      return {
        message:
          "If this account exists, a recovery link has been sent. Check your inbox.",
      };
    }
    const password = z.string().min(8).max(128).parse(input.password);
    if (input.action === "signup") {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${base}/auth/callback` },
      });
      if (error)
        throw new DomainError(
          "AUTH_ERROR",
          "Account creation could not be completed. Check your details or try signing in.",
          400,
        );
      return data.session
        ? { redirect: "/onboarding" }
        : {
            message: "Check your email to confirm your account, then sign in.",
          };
    }
    const { error } = await db.auth.signInWithPassword({ email, password });
    if (error)
      throw new DomainError(
        "AUTH_ERROR",
        "Email or password is incorrect, or your email needs confirmation.",
        400,
      );
    return { redirect: "/onboarding" };
  });
}
