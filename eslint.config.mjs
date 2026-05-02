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
    files: ["**/*.d.ts"],
    rules: {
      "import-x/no-default-export": "off",
    },
  },

  {
    rules: {
      "@stylistic/quotes": "off",
      "@typescript-eslint/consistent-type-definitions": "off",

      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "complete/complete-sentences-line-comments": "off",
      "complete/format-line-comments": "off",
      "complete/no-let-any": "off",
      "complete/no-mutable-return": "off",
      "complete/no-object-any": "off",
      "complete/prefer-plusplus": "off",
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
