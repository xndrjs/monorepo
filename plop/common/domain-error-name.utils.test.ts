import { describe, expect, it } from "vitest";
import {
  normalizeErrorCode,
  normalizeErrorMessage,
  toDomainErrorClassName,
  toScreamingSnakeCase,
  toSentenceCase,
  validateErrorCode,
  validateErrorMessage,
} from "./domain-error-name.utils.ts";

describe("domain-error-name.utils", () => {
  it("derives SCREAMING_SNAKE_CASE codes from error names", () => {
    expect(toScreamingSnakeCase("invalid master password")).toBe(
      "INVALID_MASTER_PASSWORD",
    );
  });

  it("derives sentence-case messages from error names", () => {
    expect(toSentenceCase("invalid master password")).toBe(
      "Invalid master password",
    );
  });

  it("appends Error suffix to class names", () => {
    expect(toDomainErrorClassName("invalid master password")).toBe(
      "InvalidMasterPasswordError",
    );
  });

  it("validates error code and message casing", () => {
    expect(validateErrorCode("INVALID_MASTER_PASSWORD")).toBe(true);
    expect(validateErrorCode("invalid_code")).toEqual(
      expect.stringContaining("SCREAMING_SNAKE_CASE"),
    );
    expect(validateErrorCode("")).toBe(true);
    expect(validateErrorMessage("Master password is invalid")).toBe(true);
    expect(validateErrorMessage("MASTER PASSWORD IS INVALID")).toEqual(
      expect.stringContaining("sentence case"),
    );
  });

  it("normalizes blank prompt answers from the error name", () => {
    expect(normalizeErrorCode("", "invalid master password")).toBe(
      "INVALID_MASTER_PASSWORD",
    );
    expect(normalizeErrorMessage("", "invalid master password")).toBe(
      "Invalid master password",
    );
  });
});
