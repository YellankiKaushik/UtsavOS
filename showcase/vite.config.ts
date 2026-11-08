import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, normalizePath, type Plugin } from "vite";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const showcase = fileURLToPath(new URL("./", import.meta.url));
const bundledPackages = new Set(["react", "react-dom", "scheduler", "zod"]);
const sourceRoots = [
  normalizePath(resolve(showcase, "src")) + "/",
  normalizePath(resolve(workspace, "src/domain")) + "/",
];

function showcaseBoundary(): Plugin {
  return {
    name: "utsavos-showcase-boundary",
    apply: "build",
    generateBundle(_options, bundle) {
      const packages = new Set<string>();
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        for (const id of Object.keys(output.modules)) {
          const path = normalizePath(id.replace(/^\0/, "")).split("?")[0];
          const dependency = path.match(
            /\/node_modules\/((?:@[^/]+\/)?[^/]+)\//,
          );
          if (dependency && bundledPackages.has(dependency[1])) {
            packages.add(dependency[1]);
            continue;
          }
          if (
            sourceRoots.some((root) => path.startsWith(root)) ||
            path === "rolldown:runtime" ||
            path === "rolldown/runtime.js" ||
            path === "commonjsHelpers.js" ||
            path === normalizePath(resolve(showcase, "index.html"))
          ) {
            continue;
          }
          this.error(`Unexpected module in the static showcase: ${id}`);
        }
      }
      const notices = [...packages].sort().map((name) => {
        const directory = resolve(workspace, "node_modules", name);
        const manifest = JSON.parse(
          readFileSync(resolve(directory, "package.json"), "utf8"),
        ) as { version: string; license: string };
        return [
          `${name} ${manifest.version} (${manifest.license})`,
          readFileSync(resolve(directory, "LICENSE"), "utf8").trim(),
        ].join("\n\n");
      });
      this.emitFile({
        type: "asset",
        fileName: "THIRD_PARTY_NOTICES.txt",
        source:
          ["UtsavOS showcase dependency notices", ...notices].join(
            "\n\n------------------------------------------------------------\n\n",
          ) + "\n",
      });
      this.emitFile({
        type: "asset",
        fileName: "LICENSE.txt",
        source: readFileSync(resolve(workspace, "LICENSE"), "utf8"),
      });
    },
  };
}

export default defineConfig({
  root: showcase,
  base: "/",
  envDir: false,
  envPrefix: [],
  resolve: { alias: { "@": resolve(workspace, "src") } },
  plugins: [react(), showcaseBoundary()],
  build: { outDir: "dist", modulePreload: { polyfill: false } },
});
