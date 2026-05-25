import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function getRepoRoot(): string {
  const mcpDir = dirname(fileURLToPath(import.meta.url));
  return join(mcpDir, "../..");
}
