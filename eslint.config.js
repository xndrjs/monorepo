import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import boundaries from "eslint-plugin-boundaries";
import checkFile from "eslint-plugin-check-file";
import tseslint from "typescript-eslint";

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

const sourceFiles = [
  "apps/**/*.{js,mjs,cjs,ts,tsx}",
  "packages/**/*.{js,mjs,cjs,ts,tsx}",
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
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
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
          type: "core-types",
          mode: "folder",
          pattern: "packages/core-*/types",
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
                    "ui",
                  ],
                },
              },
            },
            {
              from: { type: "core-types" },
              allow: { to: { type: "core-types" } },
            },
            {
              from: { type: "core-models" },
              allow: { to: { type: ["core-models", "core-types"] } },
            },
            {
              from: { type: "core-operations" },
              allow: {
                to: { type: ["core-models", "core-operations", "core-types"] },
              },
            },
            {
              from: { type: "core-ports" },
              allow: {
                to: { type: ["core-models", "core-ports", "core-types"] },
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
                    "core-types",
                  ],
                },
              },
            },
            {
              from: { type: "infrastructure" },
              allow: {
                to: {
                  type: ["core-models", "core-ports", "infrastructure"],
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
                "Import core packages through fixed entry points only: @core/<feature>/{models,operations,use-cases,ports}. Deep imports are forbidden.",
            },
          ],
        },
      ],
      "check-file/filename-blocklist": [
        "error",
        {
          "packages/core-*/models/!(*.shape(.test)?|*.primitive(.test)?|*.proof(.test)?|index).ts":
            "*.shape.ts, *.primitive.ts, *.proof.ts, colocated *.test.ts, or index.ts",
          "packages/core-*/types/!(*.types|index).ts": "*types.ts or index.ts",
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
    rules: {
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
