import type { NodePlopAPI } from "plop";
import { appendExport } from "../common/barrel.utils.ts";
import { toKebabCase, toPascalCase } from "../common/casing.utils.ts";
import { getCorePackageChoices } from "../common/workspace.utils.ts";

type PrimitiveScalar = "string" | "number" | "boolean";

const PRIMITIVE_SCALAR_TEMPLATE: Record<PrimitiveScalar, string> = {
  string: "templates/primitive/primitive.string.ts.hbs",
  number: "templates/primitive/primitive.number.ts.hbs",
  boolean: "templates/primitive/primitive.boolean.ts.hbs",
};

function stripTrailingPrimitiveLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+primitive\s*$/i, "")
    .replace(/[-_\s]*primitive\s*$/i, "")
    .trim();
}

function validatePrimitiveName(value: string): true | string {
  const baseName = stripTrailingPrimitiveLabel(value);

  if (!baseName) {
    return "Primitive name is required.";
  }

  if (!toKebabCase(baseName) || !toPascalCase(baseName)) {
    return "Could not normalize primitive name.";
  }

  return true;
}

function normalizePrimitiveScalar(value: unknown): PrimitiveScalar {
  if (value === "number" || value === "boolean") {
    return value;
  }

  return "string";
}

export function registerPrimitiveGenerator(plop: NodePlopAPI): void {
  const corePackageChoices = getCorePackageChoices(plop);

  plop.setGenerator("primitive", {
    description:
      "Add a domain primitive to an existing @core/<feature> package.",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Core package:",
        choices: corePackageChoices,
      },
      {
        type: "input",
        name: "primitiveName",
        message: "Primitive name:",
        validate: validatePrimitiveName,
        filter: (value: string) => stripTrailingPrimitiveLabel(value),
      },
      {
        type: "list",
        name: "primitiveScalar",
        message: "Primitive base scalar:",
        choices: [
          { name: "string", value: "string" },
          { name: "number", value: "number" },
          { name: "boolean", value: "boolean" },
        ],
        default: "string",
      },
    ],
    actions: (data) => {
      const corePackageRel = String(data?.corePackageRel ?? "");
      const baseName = stripTrailingPrimitiveLabel(
        String(data?.primitiveName ?? ""),
      );
      const kebabPrimitiveName = toKebabCase(baseName);
      const pascalName = toPascalCase(baseName);
      const primitiveScalar = normalizePrimitiveScalar(data?.primitiveScalar);

      if (!corePackageRel) {
        throw new Error("No core package selected.");
      }

      if (!kebabPrimitiveName || !pascalName) {
        throw new Error("Invalid primitive name after normalization.");
      }

      const modelsIndexPath = `${corePackageRel}/models/index.ts`;
      const primitiveFilePath = `${corePackageRel}/models/${kebabPrimitiveName}.primitive.ts`;
      const exportLine = `export * from "./${kebabPrimitiveName}.primitive";`;

      return [
        {
          type: "add",
          path: modelsIndexPath,
          template: "",
          skipIfExists: true,
        },
        {
          type: "add",
          path: primitiveFilePath,
          templateFile: PRIMITIVE_SCALAR_TEMPLATE[primitiveScalar],
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
