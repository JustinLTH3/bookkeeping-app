import { defineConfig } from "vitest/config";
import path from "path";
import { TEST_DATABASE_URL } from "./tests/integration/test-db";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.test.ts"],
    globalSetup: ["tests/integration/global-setup.ts"],
    fileParallelism: false,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
