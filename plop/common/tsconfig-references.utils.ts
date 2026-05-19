import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { NodePlopAPI } from "plop";

const PROJECT_SCOPES = ["apps", "packages"] as const;

export type TsconfigReference = {
  path: string;
};

export type RootTsconfigShape = {
  extends?: string;
  files?: string[];
  references?: TsconfigReference[];
  [key: string]: unknown;
};

/** Collect `./apps/*` and `./packages/*` dirs that contain a `tsconfig.json`. */
export function collectTsconfigProjectPaths(rootDir: string): string[] {
  const paths: string[] = [];

  for (const scope of PROJECT_SCOPES) {
    const scopePath = join(rootDir, scope);

    if (!existsSync(scopePath)) {
      continue;
    }

    for (const entry of readdirSync(scopePath).sort()) {
      if (entry.startsWith(".")) {
        continue;
      }

      const projectDir = join(scopePath, entry);

      if (!statSync(projectDir).isDirectory()) {
        continue;
      }

      if (existsSync(join(projectDir, "tsconfig.json"))) {
        paths.push(`./${scope}/${entry}`);
      }
    }
  }

  return paths.sort((a, b) => a.localeCompare(b));
}

export function buildRootTsconfigReferences(
  projectPaths: string[],
): TsconfigReference[] {
  return projectPaths.map((path) => ({ path }));
}

export function formatRootTsconfig(config: RootTsconfigShape): string {
  return `${JSON.stringify(config, null, 2)}\n`;
}

/**
 * Rewrites root `tsconfig.json` `references` from every app/package with its own tsconfig.
 * Preserves other root keys (`extends`, `files`, …).
 */
export function syncRootTsconfigReferences(rootDir: string): {
  paths: string[];
  changed: boolean;
} {
  const tsconfigPath = join(rootDir, "tsconfig.json");
  const paths = collectTsconfigProjectPaths(rootDir);
  const references = buildRootTsconfigReferences(paths);

  const config: RootTsconfigShape = existsSync(tsconfigPath)
    ? (JSON.parse(readFileSync(tsconfigPath, "utf8")) as RootTsconfigShape)
    : {
        extends: "./tsconfig.base.json",
        files: [],
      };

  const previousReferences = JSON.stringify(config.references ?? []);
  const nextReferences = JSON.stringify(references);
  const changed = previousReferences !== nextReferences;

  config.references = references;

  const content = formatRootTsconfig(config);
  const previousContent = existsSync(tsconfigPath)
    ? readFileSync(tsconfigPath, "utf8")
    : "";

  if (previousContent !== content) {
    writeFileSync(tsconfigPath, content, "utf8");
  }

  return { paths, changed };
}

export const SYNC_TSCONFIG_REFERENCES_ACTION = "syncTsconfigReferences";

export function createSyncTsconfigReferencesAction(): {
  type: typeof SYNC_TSCONFIG_REFERENCES_ACTION;
  abortOnFail: true;
} {
  return {
    type: SYNC_TSCONFIG_REFERENCES_ACTION,
    abortOnFail: true,
  };
}

export function registerSyncTsconfigReferencesAction(plop: NodePlopAPI): void {
  plop.setActionType(
    SYNC_TSCONFIG_REFERENCES_ACTION,
    (_answers, _config, api) => {
      const { paths, changed } = syncRootTsconfigReferences(
        api.getDestBasePath(),
      );

      if (paths.length === 0) {
        return changed
          ? "Cleared tsconfig.json references (no app/package tsconfig projects found)"
          : "tsconfig.json references already up to date (no projects)";
      }

      return changed
        ? `Updated tsconfig.json references (${paths.length} projects)`
        : `tsconfig.json references already up to date (${paths.length} projects)`;
    },
  );
}
