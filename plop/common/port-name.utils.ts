export function stripTrailingPortLabel(value: string): string {
  return value
    .trim()
    .replace(/\s+port\s*$/i, "")
    .replace(/[-_]+port\s*$/i, "")
    .replace(/Port\s*$/, "")
    .trim();
}
