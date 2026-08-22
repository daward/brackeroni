import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { transformWithOxc } from "vite";
import { defineConfig } from "vitest/config";

const rootDirectory = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    {
      name: "brackeroni-jsx-in-js",
      enforce: "pre",
      transform(code, id) {
        if (!id.includes("/components/") || !id.endsWith(".js")) return null;
        return transformWithOxc(code, id, { lang: "jsx", jsx: { runtime: "automatic" } });
      }
    },
    react()
  ],
  resolve: {
    alias: {
      "@": rootDirectory
    }
  },
  test: {
    environment: "jsdom",
    include: ["test/**/*.test.{jsx,ts,tsx}"],
    setupFiles: ["./test/vitest.setup.js"]
  }
});
