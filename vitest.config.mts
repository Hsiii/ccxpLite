import type { UserConfig } from "vitest/config";

export default {
  test: {
    include: ["test/vitest/**/*.test.ts"],
    environment: "node",
    restoreMocks: true,
    clearMocks: true,
  },
} satisfies UserConfig;
