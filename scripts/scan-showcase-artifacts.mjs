import { readdirSync, readFileSync } from "node:fs";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../showcase/dist/", import.meta.url));
const allowed = new Set([".html", ".css", ".js", ".svg", ".txt"]);
const sensitiveNames = Object.keys(process.env).filter((name) =>
  /^(?:(?:NEXT_PUBLIC_)?SUPABASE_|OPENROUTER_|GEMINI_|GOOGLE_GENERATIVE_AI_|DATABASE_URL$)/i.test(
    name,
  ),
);
const configured = sensitiveNames.flatMap((name) => {
  const value = process.env[name];
  return value &&
    value.length >= 12 &&
    /(?:URL|KEY|TOKEN|SECRET|PASSWORD)$/.test(name)
    ? [value]
    : [];
});
const forbidden = [
  /(?:https?:\/\/[^\s"'<>]*\.(?:supabase\.co|supabase\.in)|openrouter\.ai\/api|generativelanguage\.googleapis\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)/i,
  /\b(?:NEXT_PUBLIC_SUPABASE_[A-Z_]+|SUPABASE_SERVICE_ROLE_KEY|OPENROUTER_API_KEY|GEMINI_API_KEY)\b/,
  /(?:sk-or-v1-[\w-]{20,}|sb_secret_[\w-]{20,}|AIza[\w-]{30,}|gh[pousr]_[\w]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/,
];
const files = new Set();
function visit(directory) {
  for (const item of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    const label = relative(root, path).replaceAll("\\", "/");
    if (item.isDirectory()) {
      visit(path);
      continue;
    }
    if (!item.isFile() || !allowed.has(extname(item.name))) {
      throw Error(`Unexpected showcase artifact: ${label}`);
    }
    const content = readFileSync(path, "utf8");
    if (
      forbidden.some((pattern) => pattern.test(content)) ||
      configured.some((value) => content.includes(value))
    ) {
      throw Error(
        `Forbidden provider reference or credential pattern in ${label}`,
      );
    }
    files.add(label);
  }
}
visit(root);
for (const name of ["index.html", "LICENSE.txt", "THIRD_PARTY_NOTICES.txt"]) {
  if (!files.has(name)) throw Error(`Missing showcase artifact: ${name}`);
}
if (![...files].some((name) => name.endsWith(".js"))) {
  throw Error("Showcase has no browser JavaScript.");
}
console.log(`Showcase artifact scan passed for ${files.size} files.`);
