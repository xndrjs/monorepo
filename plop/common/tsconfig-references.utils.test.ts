import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  collectTsconfigProjectPaths,
  syncRootTsconfigReferences,
} from "./tsconfig-references.utils.ts";

describe("collectTsconfigProjectPaths", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function createWorkspace(): string {
    const root = mkdtempSync(join(tmpdir(), "clean-template-tsconfig-"));
    tempDirs.push(root);
    return root;
  }

  it("returns sorted app and package paths that have tsconfig.json", () => {
    const root = createWorkspace();
    mkdirSync(join(root, "apps", "web"), { recursive: true });
    mkdirSync(join(root, "packages", "core-billing"), { recursive: true });
    mkdirSync(join(root, "packages", "ui-react"), { recursive: true });
    mkdirSync(join(root, "packages", "infrastructure-memory"), {
      recursive: true,
    });
    mkdirSync(join(root, "packages", "no-tsconfig"), { recursive: true });

    writeFileSync(join(root, "apps", "web", "tsconfig.json"), "{}");
    writeFileSync(
      join(root, "packages", "core-billing", "tsconfig.json"),
      "{}",
    );
    writeFileSync(join(root, "packages", "ui-react", "tsconfig.json"), "{}");
    writeFileSync(
      join(root, "packages", "infrastructure-memory", "tsconfig.json"),
      "{}",
    );

    expect(collectTsconfigProjectPaths(root)).toEqual([
      "./apps/web",
      "./packages/core-billing",
      "./packages/infrastructure-memory",
      "./packages/ui-react",
    ]);
  });

  it("ignores dot-directories and files without tsconfig.json", () => {
    const root = createWorkspace();
    mkdirSync(join(root, "apps", ".gitkeep"), { recursive: true });
    mkdirSync(join(root, "packages", "core-empty"), { recursive: true });

    expect(collectTsconfigProjectPaths(root)).toEqual([]);
  });
});

describe("syncRootTsconfigReferences", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function createWorkspace(): string {
    const root = mkdtempSync(join(tmpdir(), "clean-template-sync-"));
    tempDirs.push(root);
    writeFileSync(
      join(root, "tsconfig.json"),
      `${JSON.stringify(
        {
          extends: "./tsconfig.base.json",
          files: [],
          references: [],
        },
        null,
        2,
      )}\n`,
    );
    return root;
  }

  it("updates references while preserving other root keys", () => {
    const root = createWorkspace();
    mkdirSync(join(root, "packages", "core-todos"), { recursive: true });
    writeFileSync(join(root, "packages", "core-todos", "tsconfig.json"), "{}");

    const result = syncRootTsconfigReferences(root);

    expect(result.changed).toBe(true);
    expect(result.paths).toEqual(["./packages/core-todos"]);

    const config = JSON.parse(
      readFileSync(join(root, "tsconfig.json"), "utf8"),
    ) as {
      extends: string;
      files: string[];
      references: { path: string }[];
    };

    expect(config.extends).toBe("./tsconfig.base.json");
    expect(config.files).toEqual([]);
    expect(config.references).toEqual([{ path: "./packages/core-todos" }]);
  });

  it("reports unchanged when references already match", () => {
    const root = createWorkspace();
    mkdirSync(join(root, "packages", "core-todos"), { recursive: true });
    writeFileSync(join(root, "packages", "core-todos", "tsconfig.json"), "{}");
    syncRootTsconfigReferences(root);

    const result = syncRootTsconfigReferences(root);

    expect(result.changed).toBe(false);
  });

  it("clears references when all projects are removed", () => {
    const root = createWorkspace();
    mkdirSync(join(root, "packages", "core-todos"), { recursive: true });
    writeFileSync(join(root, "packages", "core-todos", "tsconfig.json"), "{}");
    syncRootTsconfigReferences(root);
    rmSync(join(root, "packages", "core-todos"), {
      recursive: true,
      force: true,
    });

    const result = syncRootTsconfigReferences(root);

    expect(result.changed).toBe(true);
    expect(result.paths).toEqual([]);

    const config = JSON.parse(
      readFileSync(join(root, "tsconfig.json"), "utf8"),
    ) as { references: { path: string }[] };

    expect(config.references).toEqual([]);
  });
});
