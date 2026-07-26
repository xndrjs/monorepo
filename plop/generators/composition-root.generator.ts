import type { NodePlopAPI } from "plop";
import {
  CLIENT_ONLY_PACKAGE,
  CLIENT_ONLY_VERSION,
  createEnsureAppDependencyAction,
  registerEnsureAppDependencyAction,
  SERVER_ONLY_PACKAGE,
  SERVER_ONLY_VERSION,
} from "../common/package-json.utils.ts";
import {
  compositionRootExportName,
  infrastructureExportName,
} from "../common/composition-root-naming.utils.ts";
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

type CompositionRootAnswers = {
  appName: string;
  serverOnly: boolean;
  clientOnly?: boolean;
};

function defaultCompositionFileName(answers: CompositionRootAnswers): string {
  if (answers.serverOnly) {
    return `${answers.appName}-server.composition.ts`;
  }

  if (answers.clientOnly) {
    return `${answers.appName}-client.composition.ts`;
  }

  return `${answers.appName}.composition.ts`;
}

export function registerCompositionRootGenerator(plop: NodePlopAPI): void {
  registerEnsureAppDependencyAction(plop);

  plop.setHelper(
    "infrastructureExportName",
    (serverOnly: boolean, clientOnly: boolean) =>
      infrastructureExportName(Boolean(serverOnly), Boolean(clientOnly)),
  );
  plop.setHelper("compositionRootExportName", (compositionRootName: string) =>
    compositionRootExportName(compositionRootName),
  );

  const appChoices = getAppChoices(plop);

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
        type: "confirm",
        name: "serverOnly",
        message: "Will this be a server-only composition root?",
        default: false,
      },
      {
        type: "confirm",
        name: "clientOnly",
        message: "Will this be a client-only composition root?",
        default: false,
        when: (answers) => !(answers as CompositionRootAnswers).serverOnly,
      },
      {
        type: "input",
        name: "compositionRootName",
        message: "Composition root file name:",
        default: defaultCompositionFileName,
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
      {
        ...createEnsureAppDependencyAction(
          SERVER_ONLY_PACKAGE,
          SERVER_ONLY_VERSION,
        ),
        skip: (answers: CompositionRootAnswers) => !answers.serverOnly,
      },
      {
        ...createEnsureAppDependencyAction(
          CLIENT_ONLY_PACKAGE,
          CLIENT_ONLY_VERSION,
        ),
        skip: (answers: CompositionRootAnswers) =>
          !answers.clientOnly || answers.serverOnly,
      },
    ],
  });
}
