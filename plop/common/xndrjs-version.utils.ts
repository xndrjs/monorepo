import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { NodePlopAPI } from "plop";

export const DEFAULT_XNDRJS_DOMAIN_VERSION = "0.4.0-alpha.1";
export const DEFAULT_XNDRJS_DOMAIN_ZOD_VERSION = "0.4.0-alpha.1";

const XNDRJS_PACKAGES = {
  domain: "@xndrjs/domain",
  domainZod: "@xndrjs/domain-zod",
} as const;

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

function stripRangePrefix(version: string): string {
  return version.trim().replace(/^[\^~>=<]+/, "");
}

function hasPrerelease(version: string): boolean {
  return /-\w/.test(stripRangePrefix(version));
}

function formatResolvedVersion(
  maxVersion: SemverTriple | null,
  maxRawVersion: string | null,
  fallback: string,
): string {
  if (!maxVersion || !maxRawVersion) {
    return fallback;
  }

  const normalized = stripRangePrefix(maxRawVersion);

  // Pin prereleases exactly (e.g. 0.4.0-alpha.1); caret ranges drop tags.
  if (hasPrerelease(normalized)) {
    return normalized;
  }

  return `^${maxVersion.join(".")}`;
}

function collectPackageVersionsFromPackageJson(
  packageJsonPath: string,
  packageName: string,
): string[] {
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
    const declaredVersion = packageJson[section]?.[packageName];

    if (declaredVersion) {
      versions.push(declaredVersion);
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

function resolveWorkspacePackageVersion(
  repoRoot: string,
  packageName: string,
  fallback: string,
): string {
  const declaredVersions = collectPackageJsonPaths(repoRoot).flatMap(
    (packageJsonPath) =>
      collectPackageVersionsFromPackageJson(packageJsonPath, packageName),
  );

  let maxVersion: SemverTriple | null = null;
  let maxRawVersion: string | null = null;

  for (const declaredVersion of declaredVersions) {
    const triple = parseSemverTriple(declaredVersion);

    if (!triple) {
      continue;
    }

    if (!maxVersion || compareSemver(triple, maxVersion) > 0) {
      maxVersion = triple;
      maxRawVersion = declaredVersion;
    }
  }

  return formatResolvedVersion(maxVersion, maxRawVersion, fallback);
}

export function resolveWorkspaceXndrjsDomainVersion(repoRoot: string): string {
  return resolveWorkspacePackageVersion(
    repoRoot,
    XNDRJS_PACKAGES.domain,
    DEFAULT_XNDRJS_DOMAIN_VERSION,
  );
}

export function resolveWorkspaceXndrjsDomainZodVersion(
  repoRoot: string,
): string {
  return resolveWorkspacePackageVersion(
    repoRoot,
    XNDRJS_PACKAGES.domainZod,
    DEFAULT_XNDRJS_DOMAIN_ZOD_VERSION,
  );
}

export function registerXndrjsVersionHelper(plop: NodePlopAPI): void {
  const repoRoot = plop.getDestBasePath();
  const domainVersion = resolveWorkspaceXndrjsDomainVersion(repoRoot);
  const domainZodVersion = resolveWorkspaceXndrjsDomainZodVersion(repoRoot);

  plop.setHelper("xndrjsDomainVersion", () => domainVersion);
  plop.setHelper("xndrjsDomainZodVersion", () => domainZodVersion);
}
