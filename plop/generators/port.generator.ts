import type { NodePlopAPI } from "plop";
import { appendExport } from "../common/barrel.utils.ts";
import { toKebabCase, toPascalCase } from "../common/casing.utils.ts";
import { getCorePackageChoices } from "../common/workspace.utils.ts";

function stripTrailingPortLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+port\s*$/i, "")
    .replace(/[-_\s]*port\s*$/i, "")
    .trim();
}

function validatePortName(value: string): true | string {
  const baseName = stripTrailingPortLabel(value);

  if (!baseName) {
    return "Port name is required.";
  }

  if (!toKebabCase(baseName) || !toPascalCase(baseName)) {
    return "Could not normalize port name.";
  }

  return true;
}

export function registerPortGenerator(plop: NodePlopAPI): void {
  const corePackageChoices = getCorePackageChoices(plop);

  plop.setGenerator("port", {
    description: "Add a port interface to an existing @core/<feature> package.",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Core package:",
        choices: corePackageChoices,
      },
      {
        type: "input",
        name: "portName",
        message: "Port name:",
        validate: validatePortName,
        filter: (value: string) => stripTrailingPortLabel(value),
      },
    ],
    actions: (data) => {
      const corePackageRel = String(data?.corePackageRel ?? "");
      const baseName = stripTrailingPortLabel(String(data?.portName ?? ""));
      const kebabPortName = toKebabCase(baseName);
      const pascalPortName = toPascalCase(baseName);

      if (!corePackageRel) {
        throw new Error("No core package selected.");
      }

      if (!kebabPortName || !pascalPortName) {
        throw new Error("Invalid port name after normalization.");
      }

      const portsIndexPath = `${corePackageRel}/ports/index.ts`;
      const portFilePath = `${corePackageRel}/ports/${kebabPortName}.port.ts`;
      const exportLine = `export * from "./${kebabPortName}.port";`;

      return [
        {
          type: "add",
          path: portsIndexPath,
          template: "",
          skipIfExists: true,
        },
        {
          type: "add",
          path: portFilePath,
          templateFile: "templates/port/port.ts.hbs",
          data: {
            pascalPortName,
          },
          abortOnFail: true,
        },
        {
          type: "modify",
          path: portsIndexPath,
          transform: (source: string) => appendExport(source, exportLine),
        },
      ];
    },
  });
}
