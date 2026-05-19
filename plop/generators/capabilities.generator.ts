import type { NodePlopAPI } from "plop";
import { appendExport } from "../common/barrel.utils.ts";
import { toKebabCase, toPascalCase } from "../common/casing.utils.ts";
import { getCorePackageChoices } from "../common/workspace.utils.ts";

type CapabilitiesBase = "shape" | "primitive";
type PrimitiveScalar = "string" | "number" | "boolean";

const CAPABILITIES_BASE_TEMPLATE: Record<CapabilitiesBase, string> = {
  shape: "templates/capabilities/capabilities.shape.ts.hbs",
  primitive: "templates/capabilities/capabilities.primitive.ts.hbs",
};

function stripTrailingCapabilitiesLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+capabilities\s*$/i, "")
    .replace(/[-_\s]*capabilities\s*$/i, "")
    .trim();
}

function validateCapabilitiesName(value: string): true | string {
  const baseName = stripTrailingCapabilitiesLabel(value);

  if (!baseName) {
    return "Capabilities name is required.";
  }

  if (!toKebabCase(baseName) || !toPascalCase(baseName)) {
    return "Could not normalize capabilities name.";
  }

  return true;
}

function normalizeCapabilitiesBase(value: unknown): CapabilitiesBase {
  if (value === "primitive") {
    return "primitive";
  }

  return "shape";
}

function normalizePrimitiveScalar(value: unknown): PrimitiveScalar {
  if (value === "number" || value === "boolean") {
    return value;
  }

  return "string";
}

export function registerCapabilitiesGenerator(plop: NodePlopAPI): void {
  const corePackageChoices = getCorePackageChoices(plop);

  plop.setGenerator("capabilities", {
    description:
      "Add domain capabilities to an existing @core/<feature> package.",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Core package:",
        choices: corePackageChoices,
      },
      {
        type: "input",
        name: "capabilitiesName",
        message: "Capabilities name:",
        validate: validateCapabilitiesName,
        filter: (value: string) => stripTrailingCapabilitiesLabel(value),
      },
      {
        type: "list",
        name: "capabilitiesBase",
        message: "Capabilities base type:",
        choices: [
          { name: "shape (entity kit)", value: "shape" },
          { name: "primitive (scalar kit)", value: "primitive" },
        ],
        default: "shape",
      },
      {
        type: "list",
        name: "primitiveScalar",
        message: "Primitive scalar (for forPrimitive<...>):",
        choices: [
          { name: "string", value: "string" },
          { name: "number", value: "number" },
          { name: "boolean", value: "boolean" },
        ],
        default: "string",
        when: (answers: { capabilitiesBase?: string }) =>
          answers.capabilitiesBase === "primitive",
      },
    ],
    actions: (data) => {
      const corePackageRel = String(data?.corePackageRel ?? "");
      const baseName = stripTrailingCapabilitiesLabel(
        String(data?.capabilitiesName ?? ""),
      );
      const kebabCapabilitiesName = toKebabCase(baseName);
      const pascalCapabilitiesName = toPascalCase(baseName);
      const capabilitiesBase = normalizeCapabilitiesBase(
        data?.capabilitiesBase,
      );
      const primitiveScalar = normalizePrimitiveScalar(data?.primitiveScalar);

      if (!corePackageRel) {
        throw new Error("No core package selected.");
      }

      if (!kebabCapabilitiesName || !pascalCapabilitiesName) {
        throw new Error("Invalid capabilities name after normalization.");
      }

      const operationsIndexPath = `${corePackageRel}/operations/index.ts`;
      const capabilitiesFilePath = `${corePackageRel}/operations/${kebabCapabilitiesName}.capabilities.ts`;
      const exportLine = `export * from "./${kebabCapabilitiesName}.capabilities";`;

      return [
        {
          type: "add",
          path: operationsIndexPath,
          template: "",
          skipIfExists: true,
        },
        {
          type: "add",
          path: capabilitiesFilePath,
          templateFile: CAPABILITIES_BASE_TEMPLATE[capabilitiesBase],
          data: {
            pascalCapabilitiesName,
            primitiveScalar,
          },
          abortOnFail: true,
        },
        {
          type: "modify",
          path: operationsIndexPath,
          transform: (source: string) => appendExport(source, exportLine),
        },
      ];
    },
  });
}
