import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.integration.{test,spec}.{js,ts,tsx}", // Exclude integration tests (run with Bun)
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "src/**/*.test.{js,ts,tsx}",
        "src/**/*.spec.{js,ts,tsx}",
        "**/*.integration.test.{js,ts,tsx}", // Exclude integration tests from coverage
      ],
    },
  },
});
