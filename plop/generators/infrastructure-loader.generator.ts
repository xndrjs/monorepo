import type { NodePlopAPI } from "plop";
import { appendExport } from "../common/barrel.utils.ts";
import {
  toCamelCase,
  toKebabCase,
  toPascalCase,
} from "../common/casing.utils.ts";
import {
  getInfrastructurePackageChoices,
  getInfrastructurePackageName,
} from "../common/workspace.utils.ts";

interface InfrastructureLoaderAnswers {
  infrastructurePackageRel?: string;
}

function stripTrailingLoaderLabel(value: string): string {
  return value
    .trim()
    .replace(/\.loader\.ts\s*$/i, "")
    .replace(/\.ts\s*$/i, "")
    .replace(/\s+loader\s*$/i, "")
    .replace(/[-_\s]*loader\s*$/i, "")
    .trim();
}

function defaultLoaderName(answers: InfrastructureLoaderAnswers): string {
  const infrastructurePackageRel = String(
    answers.infrastructurePackageRel ?? "",
  );

  if (!infrastructurePackageRel) {
    return "";
  }

  try {
    const infrastructurePackageName = getInfrastructurePackageName(
      infrastructurePackageRel,
    );
    const packageName = infrastructurePackageName.replace(
      /^@infrastructure\//,
      "",
    );

    return packageName ? `${packageName}.loader.ts` : "";
  } catch {
    return "";
  }
}

function validateLoaderName(value: string): true | string {
  const baseName = stripTrailingLoaderLabel(value);

  if (!baseName) {
    return "Loader name is required.";
  }

  if (!toKebabCase(baseName) || !toPascalCase(baseName)) {
    return "Could not normalize loader name.";
  }

  return true;
}

export function registerInfrastructureLoaderGenerator(plop: NodePlopAPI): void {
  const infrastructurePackageChoices = getInfrastructurePackageChoices(plop);

  plop.setGenerator("infrastructure-loader", {
    description:
      "Add a loader to an existing @infrastructure/<name> package (loaders/<name>.loader.ts).",
    prompts: [
      {
        type: "list",
        name: "infrastructurePackageRel",
        message: "Infrastructure package:",
        choices: infrastructurePackageChoices,
      },
      {
        type: "input",
        name: "loaderName",
        message: "Loader name:",
        default: defaultLoaderName,
        validate: validateLoaderName,
        filter: (value: string) => stripTrailingLoaderLabel(value),
      },
    ],
    actions: (data) => {
      const infrastructurePackageRel = String(
        data?.infrastructurePackageRel ?? "",
      );
      const baseName = stripTrailingLoaderLabel(String(data?.loaderName ?? ""));
      const kebabLoaderName = toKebabCase(baseName);
      const pascalLoaderName = toPascalCase(baseName);
      const camelLoaderName = toCamelCase(baseName);

      if (!infrastructurePackageRel) {
        throw new Error("No infrastructure package selected.");
      }

      if (!kebabLoaderName || !pascalLoaderName) {
        throw new Error("Invalid loader name after normalization.");
      }

      const loadersIndexPath = `${infrastructurePackageRel}/loaders/index.ts`;
      const loaderFilePath = `${infrastructurePackageRel}/loaders/${kebabLoaderName}.loader.ts`;
      const exportLine = `export * from "./${kebabLoaderName}.loader";`;

      return [
        {
          type: "add",
          path: loadersIndexPath,
          template: "",
          skipIfExists: true,
        },
        {
          type: "add",
          path: loaderFilePath,
          templateFile: "templates/infrastructure-loader/loader.ts.hbs",
          data: {
            kebabLoaderName,
            pascalLoaderName,
            camelLoaderName,
          },
          abortOnFail: true,
        },
        {
          type: "modify",
          path: loadersIndexPath,
          transform: (source: string) => appendExport(source, exportLine),
        },
      ];
    },
  });
}
