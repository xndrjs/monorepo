import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { NodePlopAPI } from "plop";

export const SERVER_ONLY_PACKAGE = "server-only";
export const SERVER_ONLY_VERSION = "^0.0.1";

export const CLIENT_ONLY_PACKAGE = "client-only";
export const CLIENT_ONLY_VERSION = "^0.0.1";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
};

export function ensurePackageDependency(
  packageJsonPath: string,
  dependencyName: string,
  version: string,
): { changed: boolean; message: string } {
  if (!existsSync(packageJsonPath)) {
    throw new Error(`package.json not found: ${packageJsonPath}`);
  }

  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, "utf8"),
  ) as PackageJson;
  const dependencies = packageJson.dependencies ?? {};

  if (dependencies[dependencyName]) {
    return {
      changed: false,
      message: `${dependencyName} already listed in ${packageJsonPath}`,
    };
  }

  packageJson.dependencies = {
    ...dependencies,
    [dependencyName]: version,
  };

  const sortedDependencies = Object.fromEntries(
    Object.entries(packageJson.dependencies).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  );
  packageJson.dependencies = sortedDependencies;

  writeFileSync(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`,
    "utf8",
  );

  return {
    changed: true,
    message: `Added ${dependencyName}@${version} to ${packageJsonPath}`,
  };
}

export const ENSURE_APP_DEPENDENCY_ACTION = "ensureAppDependency";
export const ENSURE_PACKAGE_DEPENDENCY_ACTION = "ensurePackageDependency";

type EnsureAppDependencyConfig = {
  dependencyName?: string;
  dependencyVersion?: string;
};

type EnsurePackageDependencyConfig = {
  packageRelKey?: string;
  dependencyName?: string;
  dependencyVersion?: string;
};

export function registerEnsureAppDependencyAction(plop: NodePlopAPI): void {
  plop.setActionType(ENSURE_APP_DEPENDENCY_ACTION, (answers, config, api) => {
    const actionConfig = config as EnsureAppDependencyConfig;
    const appName = String(answers.appName ?? "");
    const dependencyName = String(actionConfig.dependencyName ?? "");
    const version = String(actionConfig.dependencyVersion ?? "");

    if (!appName || !dependencyName || !version) {
      throw new Error(
        "ensureAppDependency requires appName, dependencyName, and dependencyVersion",
      );
    }

    const packageJsonPath = join(
      api.getDestBasePath(),
      "apps",
      appName,
      "package.json",
    );

    return ensurePackageDependency(packageJsonPath, dependencyName, version)
      .message;
  });
}

export function registerEnsurePackageDependencyAction(plop: NodePlopAPI): void {
  plop.setActionType(
    ENSURE_PACKAGE_DEPENDENCY_ACTION,
    (answers, config, api) => {
      const actionConfig = config as EnsurePackageDependencyConfig;
      const packageRelKey = String(actionConfig.packageRelKey ?? "");
      const packageRel = String(
        ((answers as Record<string, unknown>)?.[packageRelKey] ?? "") as string,
      );
      const dependencyName = String(actionConfig.dependencyName ?? "");
      const version = String(actionConfig.dependencyVersion ?? "");

      if (!packageRel || !dependencyName || !version) {
        throw new Error(
          "ensurePackageDependency requires packageRel, dependencyName, and dependencyVersion",
        );
      }

      const packageJsonPath = join(
        api.getDestBasePath(),
        packageRel,
        "package.json",
      );

      return ensurePackageDependency(packageJsonPath, dependencyName, version)
        .message;
    },
  );
}

export function createEnsureAppDependencyAction(
  dependencyName: string,
  version: string,
): {
  type: typeof ENSURE_APP_DEPENDENCY_ACTION;
  dependencyName: string;
  dependencyVersion: string;
  abortOnFail: true;
} {
  return {
    type: ENSURE_APP_DEPENDENCY_ACTION,
    dependencyName,
    dependencyVersion: version,
    abortOnFail: true,
  };
}

export function createEnsurePackageDependencyAction(
  packageRelKey: string,
  dependencyName: string,
  version: string,
): {
  type: typeof ENSURE_PACKAGE_DEPENDENCY_ACTION;
  packageRelKey: string;
  dependencyName: string;
  dependencyVersion: string;
  abortOnFail: true;
} {
  return {
    type: ENSURE_PACKAGE_DEPENDENCY_ACTION,
    packageRelKey,
    dependencyName,
    dependencyVersion: version,
    abortOnFail: true,
  };
}
