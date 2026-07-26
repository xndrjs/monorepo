import type { ActionType, NodePlopAPI } from "plop";
import { appendExport } from "../common/barrel.utils.ts";
import {
  createEnsurePackageDependencyAction,
  registerEnsurePackageDependencyAction,
} from "../common/package-json.utils.ts";
import {
  toCamelCase,
  toKebabCase,
  toPascalCase,
} from "../common/casing.utils.ts";
import {
  CREATE_NEW_MAPPER,
  CREATE_NEW_PORT,
  getCorePackageChoices,
  getCorePackageName,
  getInfrastructurePackageChoices,
  getLoaderChoices,
  getMapperChoices,
  getModelChoices,
  getPortChoices,
  resolveModelIdKebab,
} from "../common/workspace.utils.ts";

interface InfrastructureRepositoryAnswers {
  corePackageRel?: string;
  kebabModelName?: string;
  infrastructurePackageRel?: string;
  kebabLoaderName?: string;
  mapperChoice?: string;
  mapperName?: string;
  portChoice?: string;
  portName?: string;
  repositoryName?: string;
}

function stripTrailingRepositoryLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+repository\s*$/i, "")
    .replace(/[-_\s]*repository\s*$/i, "")
    .trim();
}

function stripTrailingMapperLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+mapper\s*$/i, "")
    .replace(/[-_\s]*mapper\s*$/i, "")
    .trim();
}

function stripTrailingPortLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+port\s*$/i, "")
    .replace(/[-_\s]*port\s*$/i, "")
    .trim();
}

function validateRepositoryName(value: string): true | string {
  const baseName = stripTrailingRepositoryLabel(value);

  if (!baseName) {
    return "Repository name is required.";
  }

  if (!toKebabCase(baseName) || !toPascalCase(baseName)) {
    return "Could not normalize repository name.";
  }

  return true;
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

function validateMapperName(value: string): true | string {
  const baseName = stripTrailingMapperLabel(value);

  if (!baseName) {
    return "Mapper name is required.";
  }

  if (!toKebabCase(baseName) || !toPascalCase(baseName)) {
    return "Could not normalize mapper name.";
  }

  return true;
}

export function registerInfrastructureRepositoryGenerator(
  plop: NodePlopAPI,
): void {
  registerEnsurePackageDependencyAction(plop);

  const corePackageChoices = getCorePackageChoices(plop);
  const infrastructurePackageChoices = getInfrastructurePackageChoices(plop);

  plop.setGenerator("infrastructure-repository", {
    description:
      "Add a repository to an @infrastructure/<name> package wired to an existing loader and mapper.",
    prompts: [
      {
        type: "list",
        name: "corePackageRel",
        message: "Core package:",
        choices: corePackageChoices,
      },
      {
        type: "list",
        name: "kebabModelName",
        message: "Domain model:",
        choices: (answers: InfrastructureRepositoryAnswers) => {
          const choices = getModelChoices(String(answers.corePackageRel ?? ""));

          if (choices.length === 0) {
            return [
              {
                name: "(no shapes — run `pnpm generate shape` first)",
                value: "",
              },
            ];
          }

          return choices;
        },
      },
      {
        type: "list",
        name: "infrastructurePackageRel",
        message: "Infrastructure package:",
        choices: infrastructurePackageChoices,
      },
      {
        type: "list",
        name: "kebabLoaderName",
        message: "Loader (must already exist):",
        choices: (answers: InfrastructureRepositoryAnswers) => {
          const choices = getLoaderChoices(
            String(answers.infrastructurePackageRel ?? ""),
          );

          if (choices.length === 0) {
            return [
              {
                name: "(no loaders — run `pnpm generate infrastructure-loader` first)",
                value: "",
              },
            ];
          }

          return choices;
        },
      },
      {
        type: "list",
        name: "mapperChoice",
        message: "Mapper:",
        choices: (answers: InfrastructureRepositoryAnswers) => {
          const existing = getMapperChoices(
            String(answers.infrastructurePackageRel ?? ""),
          );
          const createLabel =
            existing.length === 0 ? "Create new mapper" : "Create new mapper…";

          return [...existing, { name: createLabel, value: CREATE_NEW_MAPPER }];
        },
      },
      {
        type: "input",
        name: "mapperName",
        message: "New mapper name:",
        when: (answers: InfrastructureRepositoryAnswers) =>
          answers.mapperChoice === CREATE_NEW_MAPPER,
        default: (answers: InfrastructureRepositoryAnswers) => {
          const pascalModelName = toPascalCase(
            String(answers.kebabModelName ?? ""),
          );

          return pascalModelName ? `mapRawTo${pascalModelName}` : "";
        },
        validate: validateMapperName,
        filter: (value: string) => stripTrailingMapperLabel(value),
      },
      {
        type: "list",
        name: "portChoice",
        message: "Port to implement:",
        choices: (answers: InfrastructureRepositoryAnswers) => {
          const existing = getPortChoices(String(answers.corePackageRel ?? ""));
          return [
            ...existing,
            { name: "Create new port", value: CREATE_NEW_PORT },
          ];
        },
      },
      {
        type: "input",
        name: "portName",
        message: "New port name (role, not vendor):",
        when: (answers: InfrastructureRepositoryAnswers) =>
          answers.portChoice === CREATE_NEW_PORT,
        default: (answers: InfrastructureRepositoryAnswers) => {
          const pascalModelName = toPascalCase(
            String(answers.kebabModelName ?? ""),
          );

          return pascalModelName ? `${pascalModelName}RepositoryPort` : "";
        },
        validate: validatePortName,
        filter: (value: string) => stripTrailingPortLabel(value),
      },
      {
        type: "input",
        name: "repositoryName",
        message: "Repository name:",
        default: (answers: InfrastructureRepositoryAnswers) => {
          const pascalModelName = toPascalCase(
            String(answers.kebabModelName ?? ""),
          );

          return pascalModelName ? `${pascalModelName}Repository` : "";
        },
        validate: validateRepositoryName,
        filter: (value: string) => stripTrailingRepositoryLabel(value),
      },
    ],
    actions: (data) => {
      const corePackageRel = String(data?.corePackageRel ?? "");
      const infrastructurePackageRel = String(
        data?.infrastructurePackageRel ?? "",
      );
      const kebabModelName = String(data?.kebabModelName ?? "");
      const kebabLoaderName = String(data?.kebabLoaderName ?? "");
      const mapperChoice = String(data?.mapperChoice ?? "");
      const portChoice = String(data?.portChoice ?? "");
      const repositoryBaseName = stripTrailingRepositoryLabel(
        String(data?.repositoryName ?? ""),
      );

      if (!corePackageRel || !kebabModelName) {
        throw new Error("Core package and domain model are required.");
      }

      if (!infrastructurePackageRel || !kebabLoaderName) {
        throw new Error(
          "Infrastructure package and an existing loader are required. Run `pnpm generate infrastructure-loader` first.",
        );
      }

      const kebabPortName =
        portChoice === CREATE_NEW_PORT
          ? toKebabCase(stripTrailingPortLabel(String(data?.portName ?? "")))
          : portChoice;

      if (!kebabPortName) {
        throw new Error("A port is required.");
      }

      const kebabRepositoryName = toKebabCase(repositoryBaseName);
      const pascalRepositoryName = toPascalCase(repositoryBaseName);
      const camelRepositoryName = toCamelCase(repositoryBaseName);
      const pascalModelName = toPascalCase(kebabModelName);
      const pascalLoaderName = toPascalCase(kebabLoaderName);
      const camelLoaderName = toCamelCase(kebabLoaderName);
      const pascalPortName = toPascalCase(kebabPortName);
      const corePackageName = getCorePackageName(corePackageRel);

      const kebabMapperName =
        mapperChoice === CREATE_NEW_MAPPER
          ? toKebabCase(
              stripTrailingMapperLabel(String(data?.mapperName ?? "")),
            )
          : mapperChoice;

      if (!kebabRepositoryName || !pascalRepositoryName || !kebabMapperName) {
        throw new Error("Invalid names after normalization.");
      }

      const kebabModelIdName = resolveModelIdKebab(
        corePackageRel,
        kebabModelName,
      );
      const hasModelId = kebabModelIdName !== null;
      const pascalModelIdName = hasModelId
        ? toPascalCase(kebabModelIdName)
        : "";

      const templateData = {
        coreNpmPackageName: corePackageName,
        kebabModelName,
        pascalModelName,
        hasModelId,
        kebabModelIdName: kebabModelIdName ?? "",
        pascalModelIdName,
        kebabLoaderName,
        pascalLoaderName,
        camelLoaderName,
        kebabMapperName,
        kebabPortName,
        pascalPortName,
        kebabRepositoryName,
        pascalRepositoryName,
        camelRepositoryName,
      };

      const repositoriesIndexPath = `${infrastructurePackageRel}/repositories/index.ts`;
      const repositoryFilePath = `${infrastructurePackageRel}/repositories/${kebabRepositoryName}.repository.ts`;
      const repositoryExportLine = `export * from "./${kebabRepositoryName}.repository";`;

      const actions: ActionType[] = [
        createEnsurePackageDependencyAction(
          "infrastructurePackageRel",
          corePackageName,
          "workspace:*",
        ),
        {
          type: "add",
          path: repositoriesIndexPath,
          template: "",
          skipIfExists: true,
        },
        {
          type: "add",
          path: repositoryFilePath,
          templateFile: "templates/infrastructure-repository/repository.ts.hbs",
          data: templateData,
          skipIfExists: true,
          abortOnFail: true,
        },
        {
          type: "modify",
          path: repositoriesIndexPath,
          transform: (source: string) =>
            appendExport(source, repositoryExportLine),
        },
      ];

      if (portChoice === CREATE_NEW_PORT) {
        const portsIndexPath = `${corePackageRel}/ports/index.ts`;
        const portFilePath = `${corePackageRel}/ports/${kebabPortName}.port.ts`;
        const portExportLine = `export * from "./${kebabPortName}.port";`;

        actions.unshift(
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
            data: { pascalPortName },
            abortOnFail: true,
            skipIfExists: true,
          },
          {
            type: "modify",
            path: portsIndexPath,
            transform: (source: string) => appendExport(source, portExportLine),
          },
        );
      }

      if (mapperChoice === CREATE_NEW_MAPPER) {
        const mappersIndexPath = `${infrastructurePackageRel}/mappers/index.ts`;
        const mapperFilePath = `${infrastructurePackageRel}/mappers/${kebabMapperName}.mapper.ts`;
        const mapperExportLine = `export * from "./${kebabMapperName}.mapper";`;

        actions.unshift(
          {
            type: "add",
            path: mappersIndexPath,
            template: "",
            skipIfExists: true,
          },
          {
            type: "add",
            path: mapperFilePath,
            templateFile: "templates/infrastructure-repository/mapper.ts.hbs",
            data: templateData,
            abortOnFail: true,
            skipIfExists: true,
          },
          {
            type: "modify",
            path: mappersIndexPath,
            transform: (source: string) =>
              appendExport(source, mapperExportLine),
          },
        );
      }

      return actions;
    },
  });
}
