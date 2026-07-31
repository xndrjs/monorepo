import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import checkFile from "eslint-plugin-check-file";
import tseslint from "typescript-eslint";
import cleanTemplate from "./eslint-rules/index.mjs";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

const scaffoldPackageSources = [
  "packages/core-*/**/*.{ts,tsx}",
  "packages/infrastructure-*/**/*.{ts,tsx}",
  "packages/ui-*/**/*.{ts,tsx}",
];
const scaffoldPackageMarkdown = [
  "packages/core-*/**/*.md",
  "packages/infrastructure-*/**/*.md",
  "packages/ui-*/**/*.md",
];

const jsTsFiles = [
  "apps/**/*.{js,cjs,mjs,ts,tsx}",
  "packages/**/*.{js,cjs,mjs,ts,tsx}",
  "tools/**/*.{js,cjs,mjs,ts,tsx}",
  "plop/**/*.{js,cjs,mjs,ts,tsx}",
  "eslint.config.js",
  "lint-staged.config.js",
  "vitest.config.ts",
];

const sourceFiles = [
  "apps/**/*.{js,mjs,cjs,ts,tsx}",
  "packages/**/*.{js,mjs,cjs,ts,tsx}",
  "tools/**/*.{js,mjs,cjs,ts,tsx}",
];
const coreFiles = ["packages/core-*/**/*.{js,mjs,cjs,ts,tsx}"];
const infrastructureFiles = [
  "packages/infrastructure-*/**/*.{js,mjs,cjs,ts,tsx}",
];

export default defineConfig(
  {
    ignores: [
      "node_modules/**",
      "**/dist/**",
      "build/**",
      "coverage/**",
      ".next/**",
      ".turbo/**",
      ".nx/**",
      "eslint-rules/**",
    ],
  },
  {
    files: jsTsFiles,
    ...js.configs.recommended,
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: config.files ?? jsTsFiles,
  })),
  {
    files: jsTsFiles,
    rules: {
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      globals: {
        module: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: sourceFiles,
    plugins: {
      boundaries,
      "check-file": checkFile,
    },
    settings: {
      "boundaries/include": ["apps/**/*", "packages/**/*"],
      "import/resolver": {
        typescript: {
          project: [path.join(repoRoot, "tsconfig.eslint.json")],
        },
      },
      "boundaries/elements": [
        {
          type: "app-composition",
          mode: "folder",
          pattern: "apps/*/composition",
          capture: ["app"],
        },
        {
          type: "app",
          mode: "folder",
          pattern: "apps/*",
          capture: ["app"],
        },
        {
          type: "core-errors",
          mode: "folder",
          pattern: "packages/core-*/errors",
          capture: ["feature"],
        },
        {
          type: "core-models",
          mode: "folder",
          pattern: "packages/core-*/models",
          capture: ["feature"],
        },
        {
          type: "core-operations",
          mode: "folder",
          pattern: "packages/core-*/operations",
          capture: ["feature"],
        },
        {
          type: "core-use-cases",
          mode: "folder",
          pattern: "packages/core-*/use-cases",
          capture: ["feature"],
        },
        {
          type: "core-ports",
          mode: "folder",
          pattern: "packages/core-*/ports",
          capture: ["feature"],
        },
        {
          type: "infrastructure",
          mode: "folder",
          pattern: "packages/infrastructure-*",
          capture: ["infrastructure"],
        },
        {
          type: "ui",
          mode: "folder",
          pattern: "packages/ui-*",
          capture: ["ui"],
        },
      ],
    },
    rules: {
      "boundaries/no-unknown": "warn",
      "boundaries/no-unknown-files": "warn",
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          rules: [
            {
              from: { type: "app-composition" },
              allow: {
                to: {
                  type: [
                    "app",
                    "app-composition",
                    "core-models",
                    "core-operations",
                    "core-use-cases",
                    "core-ports",
                    "core-errors",
                    "infrastructure",
                    "ui",
                  ],
                },
              },
            },
            {
              from: { type: "app" },
              allow: {
                to: {
                  type: [
                    "app",
                    "app-composition",
                    "core-models",
                    "core-ports",
                    "core-errors",
                    "ui",
                  ],
                },
              },
            },
            {
              from: { type: "app" },
              allow: {
                to: { type: "core-use-cases" },
                dependency: { kind: "type" },
              },
            },
            {
              from: { type: "core-errors" },
              allow: { to: { type: "core-errors" } },
            },
            {
              from: { type: "core-models" },
              allow: {
                to: { type: ["core-models", "core-errors"] },
              },
            },
            {
              from: { type: "core-operations" },
              allow: {
                to: {
                  type: ["core-models", "core-operations", "core-errors"],
                },
              },
            },
            {
              from: { type: "core-ports" },
              allow: {
                to: { type: ["core-models", "core-ports", "core-errors"] },
              },
            },
            {
              from: { type: "core-use-cases" },
              allow: {
                to: {
                  type: [
                    "core-models",
                    "core-operations",
                    "core-ports",
                    "core-use-cases",
                    "core-errors",
                  ],
                },
              },
            },
            {
              from: { type: "infrastructure" },
              allow: {
                to: {
                  type: [
                    "core-models",
                    "core-ports",
                    "core-errors",
                    "infrastructure",
                  ],
                },
              },
            },
            {
              from: { type: "ui" },
              allow: { to: { type: "ui" } },
            },
          ],
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@core/*/*/**"],
              message:
                "Import core packages through fixed entry points only: @core/<feature>/{models,operations,use-cases,ports,errors}. Deep imports are forbidden.",
            },
          ],
        },
      ],
      "check-file/filename-blocklist": [
        "error",
        {
          "packages/core-*/models/!(*.shape(.test)?|*.test|*.primitive(.test)?|*.proof(.test)?|index).ts":
            "*.shape.ts, *.primitive.ts, *.proof.ts, colocated *.test.ts, or index.ts",
          "packages/core-*/errors/!(*.error|index).ts":
            "*.error.ts or index.ts",
          "packages/core-*/operations/!(*.capabilities(.test)?|*.service(.test)?|index).ts":
            "*.capabilities.ts, *.service.ts, colocated *.test.ts, or index.ts",
          "packages/core-*/ports/!(*.port|index).ts": "*.port.ts or index.ts",
          "packages/core-*/use-cases/!(*.use-case(.test)?|index).ts":
            "*.use-case.ts or index.ts",
        },
      ],
    },
  },
  {
    files: scaffoldPackageSources,
    plugins: {
      "clean-template": cleanTemplate,
    },
    rules: {
      "clean-template/no-todo-doc-marker": "warn",
    },
  },
  {
    files: scaffoldPackageMarkdown,
    plugins: {
      markdown,
      "clean-template": cleanTemplate,
    },
    language: "markdown/gfm",
    rules: {
      "clean-template/no-todo-doc-marker": "warn",
    },
  },
  {
    files: coreFiles,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["{next,react}{,/**}"],
              message:
                "Framework and SDK imports are forbidden in core packages. Depend on ports instead.",
            },
            {
              group: ["@infrastructure/*", "@infrastructure/*/**"],
              message: "Core packages must not import infrastructure packages.",
            },
            {
              group: ["@ui/*", "@ui/*/**"],
              message: "Core packages must not import UI packages.",
            },
          ],
        },
      ],
    },
  },
  {
    files: infrastructureFiles,
    plugins: {
      "clean-template": cleanTemplate,
    },
    rules: {
      "clean-template/infrastructure-prefix-boundary": [
        "error",
        {
          // Explicit directed allowlist. Each from/to pair must share a
          // string prefix of from (e.g. from @infrastructure/http-rest-feature to
          // ["@infrastructure/http-rest", "@infrastructure/http"]).
          // Example:
          // allow: [
          //   { from: "@infrastructure/s3-somefeature", to: ["@infrastructure/s3"] },
          // ],
          allow: [],
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@ui/*", "@ui/*/**"],
              message: "Infrastructure packages must not import UI packages.",
            },
          ],
        },
      ],
    },
  },
);
