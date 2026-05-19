import type { NodePlopAPI } from "plop";
import { appendExport } from "../common/barrel.utils.ts";
import { toKebabCase, toPascalCase } from "../common/casing.utils.ts";
import { getCorePackageChoices } from "../common/workspace.utils.ts";

function stripTrailingShapeLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+shape\s*$/i, "")
    .replace(/[-_\s]*shape\s*$/i, "")
    .trim();
}

function validateShapeName(value: string): true | string {
  const baseName = stripTrailingShapeLabel(value);

  if (!baseName) {
    return "Shape name is required.";
  }

  if (!toKebabCase(baseName) || !toPascalCase(baseName)) {
    return "Could not normalize shape name.";
  }

  return true;
}

export function registerShapeGenerator(plop: NodePlopAPI): void {
  const corePackageChoices = getCorePackageChoices(plop);

  plop.setGenerator("shape", {
    description: "Add a domain shape to an existing @core/<feature> package.",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Core package:",
        choices: corePackageChoices,
      },
      {
        type: "input",
        name: "shapeName",
        message: "Shape name:",
        validate: validateShapeName,
        filter: (value: string) => stripTrailingShapeLabel(value),
      },
    ],
    actions: (data) => {
      const corePackageRel = String(data?.corePackageRel ?? "");
      const baseName = stripTrailingShapeLabel(String(data?.shapeName ?? ""));
      const kebabShapeName = toKebabCase(baseName);
      const pascalName = toPascalCase(baseName);

      if (!corePackageRel) {
        throw new Error("No core package selected.");
      }

      if (!kebabShapeName || !pascalName) {
        throw new Error("Invalid shape name after normalization.");
      }

      const modelsIndexPath = `${corePackageRel}/models/index.ts`;
      const shapeFilePath = `${corePackageRel}/models/${kebabShapeName}.shape.ts`;
      const exportLine = `export * from "./${kebabShapeName}.shape";`;

      return [
        {
          type: "add",
          path: modelsIndexPath,
          template: "",
          skipIfExists: true,
        },
        {
          type: "add",
          path: shapeFilePath,
          templateFile: "templates/shape/shape.ts.hbs",
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
