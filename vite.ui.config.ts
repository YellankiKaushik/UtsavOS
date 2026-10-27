import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
export default defineConfig({
  root: root + "tests/ui-harness",
  plugins: [react()],
  resolve: {
    alias: {
      "@": root + "src",
      "next/link": root + "tests/ui-harness/link.tsx",
      "next/navigation": root + "tests/ui-harness/navigation.ts",
    },
  },
  server: {
    host: "127.0.0.1",
    port: 3100,
    strictPort: true,
    fs: { allow: [root] },
  },
});
