import type { NodePlopAPI } from "plop";
import { appendExport } from "../common/barrel.utils.ts";
import {
  toCamelCase,
  toKebabCase,
  toPascalCase,
} from "../common/casing.utils.ts";
import { getCorePackageChoices } from "../common/workspace.utils.ts";

function stripTrailingUseCaseLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+use[\s_-]?case\s*$/i, "")
    .replace(/[-_\s]*usecase\s*$/i, "")
    .trim();
}

function validateUseCaseName(value: string): true | string {
  const baseName = stripTrailingUseCaseLabel(value);

  if (!baseName) {
    return "Use case name is required.";
  }

  if (!toKebabCase(baseName) || !toPascalCase(baseName)) {
    return "Could not normalize use case name.";
  }

  return true;
}

export function registerUseCaseGenerator(plop: NodePlopAPI): void {
  const corePackageChoices = getCorePackageChoices(plop);

  plop.setGenerator("use-case", {
    description: "Add a use case to an existing @core/<feature> package.",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Core package:",
        choices: corePackageChoices,
      },
      {
        type: "input",
        name: "useCaseName",
        message: "Use case name:",
        validate: validateUseCaseName,
        filter: (value: string) => stripTrailingUseCaseLabel(value),
      },
    ],
    actions: (data) => {
      const corePackageRel = String(data?.corePackageRel ?? "");
      const baseName = stripTrailingUseCaseLabel(
        String(data?.useCaseName ?? ""),
      );
      const kebabUseCaseName = toKebabCase(baseName);
      const pascalUseCaseName = toPascalCase(baseName);
      const camelUseCaseName = toCamelCase(baseName);

      if (!corePackageRel) {
        throw new Error("No core package selected.");
      }

      if (!kebabUseCaseName || !pascalUseCaseName) {
        throw new Error("Invalid use case name after normalization.");
      }

      const useCasesIndexPath = `${corePackageRel}/use-cases/index.ts`;
      const useCaseFilePath = `${corePackageRel}/use-cases/${kebabUseCaseName}.use-case.ts`;
      const useCaseTestFilePath = `${corePackageRel}/use-cases/${kebabUseCaseName}.use-case.test.ts`;
      const exportLine = `export * from "./${kebabUseCaseName}.use-case";`;
      const templateData = {
        pascalUseCaseName,
        camelUseCaseName,
        kebabUseCaseName,
      };

      return [
        {
          type: "add",
          path: useCasesIndexPath,
          template: "",
          skipIfExists: true,
        },
        {
          type: "add",
          path: useCaseFilePath,
          templateFile: "templates/use-case/use-case.ts.hbs",
          data: templateData,
          abortOnFail: true,
        },
        {
          type: "add",
          path: useCaseTestFilePath,
          templateFile: "templates/use-case/use-case.test.ts.hbs",
          data: templateData,
          abortOnFail: true,
        },
        {
          type: "modify",
          path: useCasesIndexPath,
          transform: (source: string) => appendExport(source, exportLine),
        },
      ];
    },
  });
}
