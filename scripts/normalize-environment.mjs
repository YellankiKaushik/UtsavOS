import { readFileSync, writeFileSync } from "node:fs";
const file = ".env",
  lines = readFileSync(file, "utf8").split(/\r?\n/),
  targets = new Set(["AI_PROVIDER_MODE", "AI_PROVIDER_MAX_RETRIES"]);
const last = new Map();
lines.forEach((line, i) => {
  const m = line.match(/^\s*([A-Za-z_]\w*)\s*=/);
  if (m && targets.has(m[1])) last.set(m[1], i);
});
const clean = lines
  .filter((line, i) => {
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*=/);
    return !m || !targets.has(m[1]) || last.get(m[1]) === i;
  })
  .map((line) =>
    /^\s*AI_PROVIDER_MODE\s*=/.test(line) ? "AI_PROVIDER_MODE=live" : line,
  );
writeFileSync(file, clean.join("\n"));
console.log(
  "Normalized duplicate AI settings in ignored .env; other configured values preserved.",
);
