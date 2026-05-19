import type { NodePlopAPI } from "plop";
import { appendExport } from "../common/barrel.utils.ts";
import { toKebabCase, toPascalCase } from "../common/casing.utils.ts";
import { getCorePackageChoices } from "../common/workspace.utils.ts";

function stripTrailingProofLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+proof\s*$/i, "")
    .replace(/[-_\s]*proof\s*$/i, "")
    .trim();
}

function validateProofName(value: string): true | string {
  const baseName = stripTrailingProofLabel(value);

  if (!baseName) {
    return "Proof name is required.";
  }

  if (!toKebabCase(baseName) || !toPascalCase(baseName)) {
    return "Could not normalize proof name.";
  }

  return true;
}

export function registerProofGenerator(plop: NodePlopAPI): void {
  const corePackageChoices = getCorePackageChoices(plop);

  plop.setGenerator("proof", {
    description: "Add a domain proof to an existing @core/<feature> package.",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Core package:",
        choices: corePackageChoices,
      },
      {
        type: "input",
        name: "proofName",
        message: "Proof name:",
        validate: validateProofName,
        filter: (value: string) => stripTrailingProofLabel(value),
      },
    ],
    actions: (data) => {
      const corePackageRel = String(data?.corePackageRel ?? "");
      const baseName = stripTrailingProofLabel(String(data?.proofName ?? ""));
      const kebabProofName = toKebabCase(baseName);
      const pascalName = toPascalCase(baseName);

      if (!corePackageRel) {
        throw new Error("No core package selected.");
      }

      if (!kebabProofName || !pascalName) {
        throw new Error("Invalid proof name after normalization.");
      }

      const modelsIndexPath = `${corePackageRel}/models/index.ts`;
      const proofFilePath = `${corePackageRel}/models/${kebabProofName}.proof.ts`;
      const exportLine = `export * from "./${kebabProofName}.proof";`;

      return [
        {
          type: "add",
          path: modelsIndexPath,
          template: "",
          skipIfExists: true,
        },
        {
          type: "add",
          path: proofFilePath,
          templateFile: "templates/proof/proof.ts.hbs",
          data: {
            pascalName,
          },
          abortOnFail: true,
        },
        {
          type: "modify",
          path: modelsIndexPath,
          transform: (source: string) => appendExport(source, exportLine),
        },
      ];
    },
  });
}
