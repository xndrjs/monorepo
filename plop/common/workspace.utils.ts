import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { NodePlopAPI } from "plop";

export type CorePackageChoice = {
  name: string;
  value: string;
};

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

export function getCorePackageChoices(plop: NodePlopAPI): CorePackageChoice[] {
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
