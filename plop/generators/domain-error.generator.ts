import type { NodePlopAPI } from "plop";
import { appendExport } from "../common/barrel.utils.ts";
import { toKebabCase } from "../common/casing.utils.ts";
import {
  normalizeErrorCode,
  normalizeErrorMessage,
  stripTrailingErrorLabel,
  toDomainErrorClassName,
  validateDomainErrorName,
  validateErrorCode,
  validateErrorMessage,
} from "../common/domain-error-name.utils.ts";
import { getCorePackageChoices } from "../common/workspace.utils.ts";

export function registerDomainErrorGenerator(plop: NodePlopAPI): void {
  const corePackageChoices = getCorePackageChoices(plop);

  plop.setGenerator("domain-error", {
    description:
      "Add a domain error class to an existing @core/<feature> package (errors/<kebab>.error.ts).",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Core package:",
        choices: corePackageChoices,
      },
      {
        type: "input",
        name: "errorName",
        message: "Error name (e.g. invalid master password):",
        validate: validateDomainErrorName,
        filter: (value: string) => stripTrailingErrorLabel(value),
      },
      {
        type: "input",
        name: "errorCode",
        message:
          "Error code (SCREAMING_SNAKE_CASE, blank = derived from name):",
        validate: (value: string) => validateErrorCode(value),
        filter: (value: string, answers?: { errorName?: string }) =>
          normalizeErrorCode(value, String(answers?.errorName ?? "")),
      },
      {
        type: "input",
        name: "errorMessage",
        message: "Error message (sentence case, blank = derived from name):",
        validate: (value: string, answers?: { errorName?: string }) =>
          validateErrorMessage(
            normalizeErrorMessage(value, String(answers?.errorName ?? "")),
          ),
        filter: (value: string, answers?: { errorName?: string }) =>
          normalizeErrorMessage(value, String(answers?.errorName ?? "")),
      },
    ],
    actions: (data) => {
      const corePackageRel = String(data?.corePackageRel ?? "");
      const baseName = stripTrailingErrorLabel(String(data?.errorName ?? ""));
      const kebabErrorName = toKebabCase(baseName);
      const pascalErrorName = toDomainErrorClassName(baseName);
      const errorCode = normalizeErrorCode(
        String(data?.errorCode ?? ""),
        baseName,
      );
      const errorMessage = normalizeErrorMessage(
        String(data?.errorMessage ?? ""),
        baseName,
      );

      if (!corePackageRel) {
        throw new Error("No core package selected.");
      }

      if (!kebabErrorName || !pascalErrorName) {
        throw new Error("Invalid error name after normalization.");
      }

      const errorsIndexPath = `${corePackageRel}/errors/index.ts`;
      const errorFilePath = `${corePackageRel}/errors/${kebabErrorName}.error.ts`;
      const exportLine = `export * from "./${kebabErrorName}.error";`;

      return [
        {
          type: "add",
          path: errorsIndexPath,
          template: "",
          skipIfExists: true,
        },
        {
          type: "add",
          path: errorFilePath,
          templateFile: "templates/domain-error/error.ts.hbs",
          data: {
            pascalErrorName,
            errorCode,
            errorMessage,
          },
          abortOnFail: true,
        },
        {
          type: "modify",
          path: errorsIndexPath,
          transform: (source: string) => appendExport(source, exportLine),
        },
      ];
    },
  });
}
