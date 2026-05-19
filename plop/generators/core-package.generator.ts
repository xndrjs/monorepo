import type { NodePlopAPI } from "plop";
import { toKebabCase } from "../common/casing.utils.ts";
import { createSyncTsconfigReferencesAction } from "../common/tsconfig-references.utils.ts";

const CORE_LAYERS = ["models", "operations", "use-cases", "ports"] as const;

function normalizeFeatureName(value: string): string {
  return toKebabCase(value.replace(/^@core\//, ""));
}

function validateFeatureName(value: string): true | string {
  const featureName = normalizeFeatureName(value);

  if (!featureName) {
    return "Feature name is required.";
  }

  if (!/^[a-z][a-z0-9-]*$/.test(featureName)) {
    return "Feature name must resolve to kebab-case and start with a letter.";
  }

  return true;
}

export function registerCorePackageGenerator(plop: NodePlopAPI): void {
  plop.setHelper(
    "corePackageFolder",
    (featureName: string) => `core-${normalizeFeatureName(featureName)}`,
  );
  plop.setHelper(
    "corePackageName",
    (featureName: string) => `@core/${normalizeFeatureName(featureName)}`,
  );

  plop.setGenerator("core-feature", {
    description:
      "Scaffold a @core/<feature> package with fixed layers and entry points.",
    prompts: [
      {
        type: "input",
        name: "featureName",
        message: "Core feature name:",
        validate: validateFeatureName,
        filter: normalizeFeatureName,
      },
    ],
    actions: [
      {
        type: "addMany",
        destination: "packages/{{corePackageFolder featureName}}",
        base: "templates/core-feature",
        templateFiles: "templates/core-feature/**",
        abortOnFail: true,
        data: {
          layers: CORE_LAYERS,
        },
      },
      createSyncTsconfigReferencesAction(),
    ],
  });
}
