import { loadEnv } from "vite";
export function loadLiveEnvironment(
  target: Record<string, string | undefined> = process.env,
  cwd = process.cwd(),
) {
  const values = loadEnv("live", cwd, "");
  // Shell/secret-manager values must win over files, as they do in Next.js.
  for (const [name, value] of Object.entries(values))
    if (target[name] === undefined) target[name] = value;
}
