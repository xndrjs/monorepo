/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

export interface ExportedFunction {
  name: string;
  async: boolean;
}

export function scanUtilsDirs(repoRoot: string) {
  const dirs = [
    path.join(repoRoot, "plop", "generators"),
    path.join(repoRoot, "plop", "common"),
  ];
  const modules: Record<string, string> = {};

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (
        stat.isFile() &&
        (f.endsWith(".ts") || f.endsWith(".js") || f.endsWith(".cjs"))
      ) {
        const name = path.basename(f, path.extname(f));
        modules[name] = full;
      }
    }
  });

  return modules;
}

export function listModuleExports(modulePath: string): ExportedFunction[] {
  try {
    const mod = require(modulePath);
    const keys = Object.keys(mod).filter((k) => typeof mod[k] === "function");
    return keys.map((k) => ({
      name: k,
      async: mod[k][Symbol.toStringTag] === "AsyncFunction",
    }));
  } catch {
    return [];
  }
}

export async function callModuleFunction(
  modulePath: string,
  fnName: string,
  args: any,
) {
  try {
    const mod = require(modulePath);
    const fn = mod[fnName];
    if (!fn || typeof fn !== "function") throw new Error("Function not found");
    const result = fn.length === 0 ? await fn() : await fn(args);
    return { ok: true, result };
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) };
  }
}
