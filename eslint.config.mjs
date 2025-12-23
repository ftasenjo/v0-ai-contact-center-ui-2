import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [
      "**/.next/**",
      "**/node_modules/**",
      "**/out/**",
      "**/build/**",
      "**/coverage/**",
    ],
  },

  js.configs.recommended,

  // TypeScript + TSX linting (kept intentionally lightweight for CI health gates)
  ...tseslint.configs.recommended,

  {
    files: ["**/*.{js,cjs,mjs,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // CI health gate: keep lint lightweight and non-blocking.
      // Type-safety is enforced via `pnpm run typecheck`.
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-case-declarations": "off",
      "no-useless-escape": "off",
      "prefer-const": "off",
      "no-misleading-character-class": "off",

      // React hooks correctness (safe gate)
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

