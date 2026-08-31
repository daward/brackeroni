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
        const sourcePath = id.split("?")[0];
        const isJsxInJsSource =
          sourcePath.endsWith(".js") && (sourcePath.includes("/app/") || sourcePath.includes("/components/"));

        if (!isJsxInJsSource) return null;

        return transformWithOxc(code, sourcePath, { lang: "jsx", jsx: { runtime: "automatic" } });
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
    include: ["test/**/*.test.{js,mjs,ts,tsx,jsx}"],
    setupFiles: ["./test/vitest.setup.js"],
    coverage: {
      provider: "v8",
      include: [
        "app/**/*.{js,jsx,ts,tsx}",
        "components/**/*.{js,jsx,ts,tsx}",
        "lib/**/*.{js,jsx,ts,tsx}"
      ],
      reporter: ["text", "html"]
    }
  }
});
