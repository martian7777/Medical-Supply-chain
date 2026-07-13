import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { FlatCompat } from "@eslint/eslintrc";

/**
 * ESLint 9 flat config.
 *
 * `eslint-config-next` is still shipped as legacy eslintrc (it exposes core-web-vitals.js
 * and typescript.js, with no flat entry point), so it cannot be spread into this array
 * directly. FlatCompat is the supported bridge and is what create-next-app itself emits —
 * hence @eslint/eslintrc being a real devDependency rather than a package we borrow from
 * eslint's own tree. It resolves today only because pnpm public-hoists `*eslint*`, and a
 * lint setup should not rest on a hoisting default.
 */

const compat = new FlatCompat({
  baseDirectory: dirname(fileURLToPath(import.meta.url)),
});

const config = [
  {
    // Flat config has no .eslintignore; ignores live here. Build output and vendored
    // code are not ours to lint, and linting them is slow and always noisy.
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      "test-results/**",
      "playwright-report/**",
      "supabase/**",
    ],
  },

  ...compat.extends("next/core-web-vitals", "next/typescript"),

  {
    rules: {
      // Bans `var` in real code. It does not fire inside `declare global { var … }` —
      // ambient declarations are exempt — which is why lib/db/client.ts needs no
      // exception for the one `var` in the codebase.
      "no-var": "error",

      // The codebase leans on `_` to mark a deliberately unused binding — most visibly
      // the `_: ActionState` first parameter every server action in app/(app)/actions.ts
      // takes because useActionState's signature demands it. That is a real convention
      // here, not dead code, so encode it instead of sprinkling eslint-disable lines.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    // Scripts and tests are Node-side tooling: they talk to the database with a
    // service-role key, take process.argv, and are never bundled into a page. The
    // browser-facing rules Next enforces on app code do not describe them.
    files: ["scripts/**/*.ts", "tests/**/*.ts", "e2e/**/*.ts", "*.config.{ts,mjs}"],
    rules: {
      "@next/next/no-assign-module-variable": "off",
    },
  },
];

export default config;
