import { redirect } from "next/navigation";
import { session } from "@/infrastructure/supabase/server";
import { databaseError } from "@/application/repository";
export const dynamic = "force-dynamic";
export default async function Onboarding() {
  const { db } = await session();
  const { error } = await db.rpc("create_personal_workspace");
  if (error) databaseError(error);
  redirect("/app/events");
}
