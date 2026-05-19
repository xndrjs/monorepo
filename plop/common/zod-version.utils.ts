import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { NodePlopAPI } from "plop";

export const DEFAULT_ZOD_VERSION = "^4.4.3";

type SemverTriple = [major: number, minor: number, patch: number];

function parseSemverTriple(version: string): SemverTriple | null {
  const normalized = version.trim().replace(/^[\^~>=<]+/, "");
  const match = normalized.match(/^(\d+)\.(\d+)\.(\d+)/);

  if (!match) {
    return null;
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareSemver(a: SemverTriple, b: SemverTriple): number {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) {
      return a[index] - b[index];
    }
  }

  return 0;
}

function maxSemverTriple(versions: SemverTriple[]): SemverTriple | null {
  return versions.reduce<SemverTriple | null>((max, current) => {
    if (!max || compareSemver(current, max) > 0) {
      return current;
    }

    return max;
  }, null);
}

function collectZodVersionsFromPackageJson(packageJsonPath: string): string[] {
  const packageJson = JSON.parse(
    readFileSync(packageJsonPath, "utf8"),
  ) as Record<string, Record<string, string> | undefined>;

  const sections = [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ] as const;
  const versions: string[] = [];

  for (const section of sections) {
    const zodVersion = packageJson[section]?.zod;

    if (zodVersion) {
      versions.push(zodVersion);
    }
  }

  return versions;
}

function collectPackageJsonPaths(repoRoot: string): string[] {
  const packageJsonPaths = [join(repoRoot, "package.json")];
  const workspaceDirs = ["packages", "apps"] as const;

  for (const workspaceDir of workspaceDirs) {
    const dirPath = join(repoRoot, workspaceDir);

    if (!existsSync(dirPath)) {
      continue;
    }

    for (const entry of readdirSync(dirPath)) {
      const entryPath = join(dirPath, entry);

      if (!statSync(entryPath).isDirectory()) {
        continue;
      }

      const packageJsonPath = join(entryPath, "package.json");

      if (existsSync(packageJsonPath)) {
        packageJsonPaths.push(packageJsonPath);
      }
    }
  }

  return packageJsonPaths;
}

export function resolveWorkspaceZodVersion(repoRoot: string): string {
  const declaredVersions = collectPackageJsonPaths(repoRoot).flatMap(
    collectZodVersionsFromPackageJson,
  );
  const parsedVersions = declaredVersions
    .map(parseSemverTriple)
    .filter((version): version is SemverTriple => version !== null);
  const maxVersion = maxSemverTriple(parsedVersions);

  if (!maxVersion) {
    return DEFAULT_ZOD_VERSION;
  }

  return `^${maxVersion.join(".")}`;
}

export function registerZodVersionHelper(plop: NodePlopAPI): void {
  const resolvedVersion = resolveWorkspaceZodVersion(plop.getDestBasePath());

  plop.setHelper("zodVersion", () => resolvedVersion);
}
