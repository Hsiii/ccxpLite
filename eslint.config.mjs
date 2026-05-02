import { completeConfigBase } from "eslint-config-complete";
import { defineConfig } from "eslint/config";

export default defineConfig(
  ...completeConfigBase,

  {
    ignores: [
      ".build/**",
      ".playwright-cli/**",
      "dist/**",
      "fixtures/ccxp-snapshot/**",
      "node_modules/**",
      "src/content.decaptcha.model.ts",
    ],
  },

  {
    rules: {
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "complete/no-mutable-return": "off",
      "complete/prefer-readonly-parameter-types": "off",
      "complete/require-ascii": "off",
      "complete/require-variadic-function-argument": "off",
      "import-x/no-unassigned-import": [
        "error",
        {
          allow: ["**/*.css"],
        },
      ],
      "no-param-reassign": "off",
      "unicorn/no-null": "off",
    },
  },
);
