import { defineConfig } from "vitest/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

/**
 * Vitest configuration. Tests target the pure, deterministic logic modules
 * (compression targets, page-range parsing, intent matching, suggestions) —
 * the correctness-critical core. The "@/" alias mirrors tsconfig so tests
 * import modules exactly as the app does.
 */
export default defineConfig({
  resolve: {
    alias: { "@": root },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
