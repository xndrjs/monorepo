import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncRootTsconfigReferences } from "../common/tsconfig-references.utils.ts";
import { getRepoRoot } from "./repo-root.ts";
import { runGenerator } from "./run-generator.ts";

const infraPackageDir = join(getRepoRoot(), "packages/infrastructure-mcp-test");

afterEach(() => {
  if (existsSync(infraPackageDir)) {
    rmSync(infraPackageDir, { recursive: true, force: true });
  }

  syncRootTsconfigReferences(getRepoRoot());
});

describe("runGenerator", () => {
  it("rejects unknown generator names", async () => {
    const result = await runGenerator("not-a-generator", {});

    expect(result.success).toBe(false);
    expect(result.validationErrors?.[0]?.field).toBe("generator");
  });

  it("validates required answers", async () => {
    const result = await runGenerator("shape", {});

    expect(result.success).toBe(false);
    expect(result.validationErrors?.length).toBeGreaterThan(0);
    expect(
      result.validationErrors?.some((error) => error.field === "shapeName"),
    ).toBe(true);
  });

  it("scaffolds an infrastructure package when answers are valid", async () => {
    const result = await runGenerator("infrastructure-package", {
      packageName: "mcp-test",
    });

    expect(result.success).toBe(true);
    expect(
      result.changes.some((path) => path.includes("infrastructure-mcp-test")),
    ).toBe(true);
    expect(existsSync(infraPackageDir)).toBe(true);
  });
});
