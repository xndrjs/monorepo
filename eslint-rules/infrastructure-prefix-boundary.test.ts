import { describe, expect, it } from "vitest";
import {
  isInfrastructurePrefixTarget,
  normalizeInfrastructurePackageId,
  parseAllowOptions,
} from "./infrastructure-prefix-boundary.mjs";

describe("isInfrastructurePrefixTarget", () => {
  it("requires to to be a string prefix of from", () => {
    expect(isInfrastructurePrefixTarget("http-rest-feature", "http-rest")).toBe(
      true,
    );
    expect(isInfrastructurePrefixTarget("http-rest-feature", "http")).toBe(
      true,
    );
    expect(isInfrastructurePrefixTarget("s3somefeature", "s3")).toBe(true);
  });

  it("rejects the reverse direction", () => {
    expect(isInfrastructurePrefixTarget("http", "http-rest-feature")).toBe(
      false,
    );
  });

  it("rejects unrelated packages", () => {
    expect(isInfrastructurePrefixTarget("s3-somefeature", "contentful")).toBe(
      false,
    );
  });
});

describe("normalizeInfrastructurePackageId", () => {
  it("normalizes bare tokens and scoped ids", () => {
    expect(normalizeInfrastructurePackageId("s3")).toBe("@infrastructure/s3");
    expect(normalizeInfrastructurePackageId("@infrastructure/s3")).toBe(
      "@infrastructure/s3",
    );
  });

  it("rejects subpaths", () => {
    expect(normalizeInfrastructurePackageId("@infrastructure/s3/clients")).toBe(
      null,
    );
  });
});

describe("parseAllowOptions", () => {
  it("keeps valid directed edges", () => {
    const { allowByFrom, invalidEntries } = parseAllowOptions({
      allow: [
        {
          from: "@infrastructure/http-rest-feature",
          to: ["@infrastructure/http-rest", "@infrastructure/http"],
        },
      ],
    });

    expect(invalidEntries).toEqual([]);
    expect(
      allowByFrom
        .get("@infrastructure/http-rest-feature")
        ?.has("@infrastructure/http-rest"),
    ).toBe(true);
    expect(
      allowByFrom
        .get("@infrastructure/http-rest-feature")
        ?.has("@infrastructure/http"),
    ).toBe(true);
  });

  it("rejects to that is not a prefix of from", () => {
    const { allowByFrom, invalidEntries } = parseAllowOptions({
      allow: [
        {
          from: "@infrastructure/http",
          to: ["@infrastructure/http-rest-feature"],
        },
      ],
    });

    expect(allowByFrom.get("@infrastructure/http")?.size ?? 0).toBe(0);
    expect(invalidEntries).toHaveLength(1);
    expect(invalidEntries[0]?.to).toBe("@infrastructure/http-rest-feature");
  });
});
