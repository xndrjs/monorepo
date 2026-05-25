import { describe, expect, it } from "vitest";
import { describeGenerator, listGenerators } from "./describe-generator.ts";

describe("describeGenerator", () => {
  it("lists all registered generators", async () => {
    const generators = await listGenerators();
    const names = generators.map((entry) => entry.name);

    expect(names).toContain("core-feature");
    expect(names).toContain("shape");
    expect(names).toContain("port");
    expect(names).toContain("use-case");
    expect(names).toContain("capabilities");
    expect(names).toContain("infrastructure-package");
    expect(names).toContain("composition-root");
  });

  it("describes core-feature prompts", async () => {
    const description = await describeGenerator("core-feature");

    expect(description.prompts).toHaveLength(1);
    expect(description.prompts[0]?.name).toBe("featureName");
    expect(description.prompts[0]?.type).toBe("input");
  });

  it("describes shape prompts with core package list and shape name input", async () => {
    const description = await describeGenerator("shape");

    const corePackagePrompt = description.prompts.find(
      (prompt) => prompt.name === "corePackageRel",
    );
    const shapeNamePrompt = description.prompts.find(
      (prompt) => prompt.name === "shapeName",
    );

    expect(corePackagePrompt?.type).toBe("list");
    const choices = corePackagePrompt?.choices ?? [];
    for (const choice of choices) {
      expect(choice.value).toMatch(/^packages\/core-/);
      expect(choice.label.length).toBeGreaterThan(0);
    }
    expect(shapeNamePrompt?.type).toBe("input");
  });

  it("describes capabilities primitiveScalar when requirement", async () => {
    const description = await describeGenerator("capabilities");

    const primitiveScalarPrompt = description.prompts.find(
      (prompt) => prompt.name === "primitiveScalar",
    );

    expect(primitiveScalarPrompt?.when).toEqual({
      requires: { capabilitiesBase: "primitive" },
    });
  });
});
