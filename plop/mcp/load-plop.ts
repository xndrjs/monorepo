import { join } from "node:path";
import nodePlop, { type NodePlopAPI } from "node-plop";
import { getRepoRoot } from "./repo-root.ts";

let plopInstance: NodePlopAPI | null = null;

export async function getPlop(): Promise<NodePlopAPI> {
  if (!plopInstance) {
    const repoRoot = getRepoRoot();
    plopInstance = await nodePlop(join(repoRoot, "plop/plopfile.cjs"), {
      destBasePath: repoRoot,
      force: false,
    });
  }

  return plopInstance;
}

export function resetPlopForTests(): void {
  plopInstance = null;
}
