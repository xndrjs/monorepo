import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { NodePlopAPI } from "plop";

export type PackageChoice = {
  name: string;
  value: string;
};

/** @deprecated Use PackageChoice */
export type CorePackageChoice = PackageChoice;

export const CREATE_NEW_MAPPER = "__create_new__";
export const CREATE_NEW_PORT = "__create_new_port__";

function readPackageName(packageRel: string): string | null {
  const packageJsonPath = join(packageRel, "package.json");

  if (!existsSync(packageJsonPath)) {
    return null;
  }

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    name?: string;
  };

  return String(packageJson.name ?? "") || null;
}

function listFilesWithSuffix(
  packageRel: string,
  subdir: string,
  suffix: string,
): string[] {
  const dirPath = join(packageRel, subdir);

  if (!existsSync(dirPath)) {
    return [];
  }

  return readdirSync(dirPath)
    .filter((entry) => entry.endsWith(suffix))
    .map((entry) => entry.slice(0, -suffix.length))
    .sort();
}

export function getAppChoices(plop: NodePlopAPI): string[] {
  const appsPath = join(plop.getDestBasePath(), "apps");

  if (!existsSync(appsPath)) {
    return [];
  }

  return readdirSync(appsPath)
    .filter((entry) => !entry.startsWith("."))
    .filter((entry) => statSync(join(appsPath, entry)).isDirectory())
    .sort();
}

export function getCorePackageName(corePackageRel: string): string {
  const packageName = readPackageName(corePackageRel);

  if (!packageName?.startsWith("@core/")) {
    throw new Error(`Invalid core package path: ${corePackageRel}`);
  }

  return packageName;
}

export function getInfrastructurePackageName(
  infrastructurePackageRel: string,
): string {
  const packageName = readPackageName(infrastructurePackageRel);

  if (!packageName?.startsWith("@infrastructure/")) {
    throw new Error(
      `Invalid infrastructure package path: ${infrastructurePackageRel}`,
    );
  }

  return packageName;
}

export function getModelChoices(corePackageRel: string): PackageChoice[] {
  return listFilesWithSuffix(corePackageRel, "models", ".shape.ts").map(
    (kebabName) => ({
      name: kebabName,
      value: kebabName,
    }),
  );
}

export function getPortChoices(corePackageRel: string): PackageChoice[] {
  return listFilesWithSuffix(corePackageRel, "ports", ".port.ts").map(
    (kebabName) => ({
      name: kebabName,
      value: kebabName,
    }),
  );
}

export function getLoaderChoices(
  infrastructurePackageRel: string,
): PackageChoice[] {
  return listFilesWithSuffix(
    infrastructurePackageRel,
    "loaders",
    ".loader.ts",
  ).map((kebabName) => ({
    name: kebabName,
    value: kebabName,
  }));
}

export function getMapperChoices(
  infrastructurePackageRel: string,
): PackageChoice[] {
  return listFilesWithSuffix(
    infrastructurePackageRel,
    "mappers",
    ".mapper.ts",
  ).map((kebabName) => ({
    name: kebabName,
    value: kebabName,
  }));
}

export function resolveModelIdKebab(
  corePackageRel: string,
  kebabModelName: string,
): string | null {
  const candidate = `${kebabModelName}-id`;
  const primitivePath = join(
    corePackageRel,
    "models",
    `${candidate}.primitive.ts`,
  );

  return existsSync(primitivePath) ? candidate : null;
}

export function getCorePackageChoices(plop: NodePlopAPI): PackageChoice[] {
  const packagesPath = join(plop.getDestBasePath(), "packages");

  if (!existsSync(packagesPath)) {
    return [];
  }

  return readdirSync(packagesPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => entry.name.startsWith("core-"))
    .flatMap((entry) => {
      const packageJsonPath = join(packagesPath, entry.name, "package.json");

      if (!existsSync(packageJsonPath)) {
        return [];
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        name?: string;
      };
      const packageName = String(packageJson.name ?? "");

      if (!packageName.startsWith("@core/")) {
        return [];
      }

      return [
        {
          name: `${packageName} - packages/${entry.name}`,
          value: `packages/${entry.name}`,
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getInfrastructurePackageChoices(
  plop: NodePlopAPI,
): PackageChoice[] {
  const packagesPath = join(plop.getDestBasePath(), "packages");

  if (!existsSync(packagesPath)) {
    return [];
  }

  return readdirSync(packagesPath, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => entry.name.startsWith("infrastructure-"))
    .flatMap((entry) => {
      const packageJsonPath = join(packagesPath, entry.name, "package.json");

      if (!existsSync(packageJsonPath)) {
        return [];
      }

      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
        name?: string;
      };
      const packageName = String(packageJson.name ?? "");

      if (!packageName.startsWith("@infrastructure/")) {
        return [];
      }

      return [
        {
          name: `${packageName} - packages/${entry.name}`,
          value: `packages/${entry.name}`,
        },
      ];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
