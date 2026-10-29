import { rsvpRequest } from "@/domain/guests";
import { DomainError } from "@/domain/errors";
import { checkOrigin, handle, key, readBody } from "@/application/http";
import { databaseError } from "@/application/repository";
import { createClient } from "@/infrastructure/supabase/server";

export async function POST(request: Request) {
  return handle(async () => {
    if (process.env.FEATURE_GUESTS !== "true")
      throw new DomainError("NOT_FOUND", "Module not enabled", 404);
    checkOrigin(request);
    const input = rsvpRequest.parse(await readBody(request));
    const db = await createClient();
    const result =
      input.action === "read"
        ? await db.rpc("rsvp_view", { p_token: input.token })
        : await db.rpc("rsvp_respond", {
            p_token: input.token,
            p_answers: input.answers,
            p_idempotency_key: key(request),
          });
    if (result.error) databaseError(result.error);
    return result.data;
  });
}
