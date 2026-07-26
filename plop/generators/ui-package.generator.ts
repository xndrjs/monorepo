import type { NodePlopAPI } from "plop";
import { toKebabCase } from "../common/casing.utils.ts";
import { createSyncTsconfigReferencesAction } from "../common/tsconfig-references.utils.ts";

function normalizeUiPackageName(value: string): string {
  return toKebabCase(value.replace(/^@ui\//, ""));
}

function validateUiPackageName(value: string): true | string {
  const packageName = normalizeUiPackageName(value);

  if (!packageName) {
    return "UI package name is required.";
  }

  if (!/^[a-z][a-z0-9-]*$/.test(packageName)) {
    return "UI package name must resolve to kebab-case and start with a letter.";
  }

  return true;
}

export function registerUiPackageGenerator(plop: NodePlopAPI): void {
  plop.setHelper(
    "uiPackageFolder",
    (packageName: string) => `ui-${normalizeUiPackageName(packageName)}`,
  );
  plop.setHelper(
    "uiPackageName",
    (packageName: string) => `@ui/${normalizeUiPackageName(packageName)}`,
  );

  plop.setGenerator("ui-package", {
    description:
      "Scaffold a @ui/<name> package with a single index entrypoint.",
    prompts: [
      {
        type: "input",
        name: "packageName",
        message: "UI package name:",
        validate: validateUiPackageName,
        filter: normalizeUiPackageName,
      },
      {
        type: "confirm",
        name: "setupVitest",
        message: "Add a minimal Vitest example test?",
        default: true,
      },
      {
        type: "list",
        name: "vitestProject",
        message: "Vitest project (from root vitest.config.ts):",
        choices: [
          { name: "react (jsdom, *.test.tsx)", value: "react" },
          { name: "node (*.test.ts)", value: "node" },
        ],
        default: "react",
        when: (answers) => Boolean(answers.setupVitest),
      },
    ],
    actions: (answers) => {
      const packageName = normalizeUiPackageName(String(answers.packageName));
      const destination = `packages/ui-${packageName}`;
      const actions = [
        {
          type: "addMany",
          destination,
          base: "templates/ui-package",
          templateFiles: "templates/ui-package/**",
          globOptions: {
            ignore: ["**/index.test.ts.hbs", "**/index.test.tsx.hbs"],
          },
          abortOnFail: true,
        },
      ];

      if (answers.setupVitest) {
        const vitestProject =
          answers.vitestProject === "node" ? "node" : "react";
        const testFile =
          vitestProject === "react" ? "index.test.tsx" : "index.test.ts";
        const templateFile =
          vitestProject === "react"
            ? "templates/ui-package/index.test.tsx.hbs"
            : "templates/ui-package/index.test.ts.hbs";

        actions.push({
          type: "add",
          path: `${destination}/${testFile}`,
          templateFile,
          data: { vitestProject },
          abortOnFail: true,
        });
      }

      actions.push(createSyncTsconfigReferencesAction());

      return actions;
    },
  });
}
