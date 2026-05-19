import { parse } from "node:path";
import type { NodePlopAPI } from "plop";
import { toPascalCase } from "../common/casing.utils.ts";
import { getAppChoices } from "../common/workspace.utils.ts";

function normalizeCompositionFileName(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return trimmed;
  }

  return trimmed.endsWith(".ts") ? trimmed : `${trimmed}.ts`;
}

function validateCompositionFileName(value: string): true | string {
  const fileName = normalizeCompositionFileName(value);

  if (!fileName) {
    return "Composition root file name is required.";
  }

  if (fileName.includes("/") || fileName.includes("\\")) {
    return "Composition root file name must not include path separators.";
  }

  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]*\.ts$/.test(fileName)) {
    return "Composition root file name must be a TypeScript file name.";
  }

  return true;
}

export function registerCompositionRootGenerator(plop: NodePlopAPI): void {
  const appChoices = getAppChoices(plop);

  plop.setHelper("compositionRootPascalName", (fileName: string) =>
    toPascalCase(parse(fileName).name),
  );

  plop.setGenerator("composition-root", {
    description: "Add a composition root file to an existing app.",
    prompts: [
      {
        type: "list",
        name: "appName",
        message: "App:",
        choices: appChoices,
      },
      {
        type: "input",
        name: "compositionRootName",
        message: "Composition root file name:",
        default: ({ appName }: { appName: string }) =>
          `${appName}.composition.ts`,
        validate: validateCompositionFileName,
        filter: normalizeCompositionFileName,
      },
    ],
    actions: [
      {
        type: "add",
        path: "apps/{{appName}}/composition/{{compositionRootName}}",
        templateFile: "templates/composition-root/composition-root.ts.hbs",
        abortOnFail: true,
      },
    ],
  });
}
