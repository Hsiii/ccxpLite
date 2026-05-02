import { completeConfigBase } from "eslint-config-complete";

export default [
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
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/prefer-nullish-coalescing": "off",
      "@typescript-eslint/strict-boolean-expressions": "off",
      "complete/require-ascii": "off",
      "import-x/no-unassigned-import": [
        "error",
        {
          allow: ["**/*.css"],
        },
      ],
      "unicorn/no-null": "off",
    },
  },
];
