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
    ],
  },

  {
    rules: {
      "import-x/no-unassigned-import": [
        "error",
        {
          allow: ["**/*.css"],
        },
      ],
    },
  },
];
