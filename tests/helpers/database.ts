import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
export const A = "11111111-1111-4111-8111-111111111111";
export const B = "22222222-2222-4222-8222-222222222222";
export const C = "33333333-3333-4333-8333-333333333333";
export async function database(options: { storage?: boolean } = {}) {
  const db = new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role;
    create schema auth;create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
    insert into auth.users values('${A}','a@example.test'),('${B}','b@example.test'),('${C}','c@example.test');`);
  if (options.storage)
    await db.exec(`create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean not null default false,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated,anon;
    grant select,insert,update,delete on storage.objects to authenticated,anon;`);
  for (const file of readdirSync("supabase/migrations")
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  return db;
}
export async function actor(
  db: PGlite,
  id: string | null,
  role = "authenticated",
) {
  if (!["anon", "authenticated", "service_role"].includes(role))
    throw new Error("Unknown synthetic role");
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
    id ?? "",
  ]);
  await db.exec(`set role ${role}`);
}
export async function event(db: PGlite, owner = A) {
  await actor(db, owner);
  const w = (
    await db.query<{ id: string }>(
      "select public.create_personal_workspace() id",
    )
  ).rows[0].id;
  const data = (
    await db.query<{ r: { id: string; version: number } }>(
      "select public.event_command(null,$1,'create',$2::jsonb,null,$3,'synthetic-test') r",
      [
        w,
        JSON.stringify({
          type: "wedding",
          title: "Synthetic isolated event",
          dateStatus: "tbd",
          startsAt: null,
          timeZone: "Asia/Kolkata",
          guestCount: 150,
          currency: "INR",
          budgetMinor: "50000000",
          status: "planning",
          preferences: "",
        }),
        crypto.randomUUID(),
      ],
    )
  ).rows[0].r;
  return { workspace: w, id: data.id, version: data.version };
}
