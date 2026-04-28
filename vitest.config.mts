import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/vitest/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
    clearMocks: true,
  },
});
