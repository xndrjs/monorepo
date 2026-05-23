import type { NodePlopAPI } from "plop";
import { toKebabCase } from "../common/casing.utils.ts";
import { createPackageReadmeAction } from "../common/package-readme.utils.ts";
import { createSyncTsconfigReferencesAction } from "../common/tsconfig-references.utils.ts";

function normalizeInfrastructurePackageName(value: string): string {
  return toKebabCase(value.replace(/^@infrastructure\//, ""));
}

function validateInfrastructurePackageName(value: string): true | string {
  const packageName = normalizeInfrastructurePackageName(value);

  if (!packageName) {
    return "Infrastructure package name is required.";
  }

  if (!/^[a-z][a-z0-9-]*$/.test(packageName)) {
    return "Infrastructure package name must resolve to kebab-case and start with a letter.";
  }

  return true;
}

export function registerInfrastructurePackageGenerator(
  plop: NodePlopAPI,
): void {
  plop.setHelper(
    "infrastructurePackageFolder",
    (packageName: string) =>
      `infrastructure-${normalizeInfrastructurePackageName(packageName)}`,
  );
  plop.setHelper(
    "infrastructurePackageName",
    (packageName: string) =>
      `@infrastructure/${normalizeInfrastructurePackageName(packageName)}`,
  );

  plop.setGenerator("infrastructure-package", {
    description:
      "Scaffold an @infrastructure/<name> package with a single index entrypoint.",
    prompts: [
      {
        type: "input",
        name: "packageName",
        message: "Infrastructure package name:",
        validate: validateInfrastructurePackageName,
        filter: normalizeInfrastructurePackageName,
      },
    ],
    actions: (answers) => {
      const packageName = normalizeInfrastructurePackageName(
        String(answers.packageName),
      );
      const destination = `packages/infrastructure-${packageName}`;

      return [
        {
          type: "addMany",
          destination,
          base: "templates/infrastructure-package",
          templateFiles: "templates/infrastructure-package/**",
          abortOnFail: true,
          data: { packageName },
        },
        createPackageReadmeAction(
          `${destination}/README.md`,
          `@infrastructure/${packageName}`,
        ),
        createSyncTsconfigReferencesAction(),
      ];
    },
  });
}
