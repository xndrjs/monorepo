import { toKebabCase, toPascalCase } from "./casing.utils.ts";

const SCREAMING_SNAKE_PATTERN = /^[A-Z][A-Z0-9_]*$/;

export function stripTrailingErrorLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+error\s*$/i, "")
    .replace(/[-_\s]*error\s*$/i, "")
    .trim();
}

export function toScreamingSnakeCase(value: string): string {
  return toKebabCase(value).replace(/-/g, "_").toUpperCase();
}

export function toSentenceCase(value: string): string {
  const normalized = value
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();

  if (!normalized) {
    return "";
  }

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function toDomainErrorClassName(value: string): string {
  const baseName = stripTrailingErrorLabel(value);
  const pascalName = toPascalCase(baseName);

  if (!pascalName) {
    return "";
  }

  return pascalName.endsWith("Error") ? pascalName : `${pascalName}Error`;
}

export function validateDomainErrorName(value: string): true | string {
  const baseName = stripTrailingErrorLabel(value);

  if (!baseName) {
    return "Error name is required.";
  }

  if (!toKebabCase(baseName) || !toDomainErrorClassName(baseName)) {
    return "Could not normalize error name.";
  }

  return true;
}

export function validateErrorCode(value: string): true | string {
  const trimmed = value.trim();

  if (!trimmed) {
    return true;
  }

  if (!SCREAMING_SNAKE_PATTERN.test(trimmed)) {
    return 'Error code must be SCREAMING_SNAKE_CASE (e.g. "INVALID_MASTER_PASSWORD").';
  }

  return true;
}

export function validateErrorMessage(value: string): true | string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "Error message is required.";
  }

  if (!/^[A-Z]/.test(trimmed)) {
    return "Error message must use sentence case (start with an uppercase letter).";
  }

  if (/^[A-Z0-9_]+$/.test(trimmed.replace(/\s/g, "_"))) {
    return "Error message must use sentence case, not SCREAMING_SNAKE_CASE.";
  }

  if (/[A-Z]{2,}/.test(trimmed.slice(1))) {
    return "Error message must use sentence case (avoid ALL CAPS words).";
  }

  return true;
}

export function normalizeErrorCode(value: string, errorName: string): string {
  const trimmed = value.trim();
  return trimmed || toScreamingSnakeCase(errorName);
}

export function normalizeErrorMessage(
  value: string,
  errorName: string,
): string {
  const candidate =
    value.trim() || toSentenceCase(stripTrailingErrorLabel(errorName));
  return toSentenceCase(candidate);
}
