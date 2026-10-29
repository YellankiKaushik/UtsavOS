import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { format } from "prettier";
const db = new PGlite();
await db.exec(
  "create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;",
);
for (const file of readdirSync("supabase/migrations")
  .filter((f) => f.endsWith(".sql"))
  .sort())
  await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
const { rows } = await db.query(
  "select table_name,column_name,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position",
);
const map = {
  uuid: "string",
  text: "string",
  timestamptz: "string",
  int4: "number",
  int8: "number",
  bool: "boolean",
  jsonb: "Json",
};
let output =
  "// Generated from the executed migrations by scripts/generate-database-types.mjs.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database = { public: { Tables: {\n";
for (const table of [...new Set(rows.map((r) => r.table_name))]) {
  const cols = rows.filter((r) => r.table_name === table);
  output += `  ${table}: { Row: {\n`;
  for (const col of cols)
    output += `    ${col.column_name}: ${map[col.udt_name] ?? "unknown"}${col.is_nullable === "YES" ? " | null" : ""};\n`;
  output += "  }; Insert: {\n";
  for (const col of cols)
    output += `    ${col.column_name}${col.column_default !== null || col.is_nullable === "YES" ? "?" : ""}: ${map[col.udt_name] ?? "unknown"}${col.is_nullable === "YES" ? " | null" : ""};\n`;
  output += "  }; Update: {\n";
  for (const col of cols)
    output += `    ${col.column_name}?: ${map[col.udt_name] ?? "unknown"}${col.is_nullable === "YES" ? " | null" : ""};\n`;
  output += "  }; Relationships: [] };\n";
}
output +=
  "}; Views: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never>; Functions: {\n";
const functions = (
  await db.query(
    "select p.proname,p.proargnames,p.proargtypes::oid[] as types,t.typname as return_type from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_type t on t.oid=p.prorettype where n.nspname='public' order by p.proname",
  )
).rows;
for (const f of functions) {
  const args = [];
  for (let i = 0; i < (f.proargnames ?? []).length; i++) {
    const type = (
      await db.query("select typname from pg_type where oid=$1", [f.types[i]])
    ).rows[0].typname;
    args.push(
      `${f.proargnames[i]}: ${map[type] ?? "unknown"}${["p_event_id", "p_workspace_id", "p_expected_version"].includes(f.proargnames[i]) ? " | null" : ""}`,
    );
  }
  output += `${f.proname}: { Args: ${args.length ? `{${args.join(";")}}` : "Record<string, never>"}; Returns: ${map[f.return_type] ?? "unknown"} };\n`;
}
output += "} } };\n";
mkdirSync("src/generated", { recursive: true });
writeFileSync(
  "src/generated/database.types.ts",
  await format(output, { parser: "typescript" }),
);
await db.close();
console.log("Database types generated from PostgreSQL catalogue.");
