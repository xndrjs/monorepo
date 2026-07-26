/* eslint-disable @typescript-eslint/no-explicit-any */
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const nodePlopModule = require("node-plop");
const nodePlop =
  typeof nodePlopModule === "function"
    ? nodePlopModule
    : nodePlopModule.default;

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
export const repoRoot = path.resolve(packageRoot, "../..");

const plopFile = path.join(repoRoot, "plop", "plopfile.cjs");

let plop: any;
let plopReady: Promise<any> | null = null;
let loadError: string | null = null;

async function ensurePlop() {
  if (plop) return plop;
  if (loadError) throw new Error(loadError);
  if (!plopReady) {
    plopReady = nodePlop(plopFile, { destBasePath: repoRoot })
      .then((instance: any) => {
        plop = instance;
        return instance;
      })
      .catch((err: any) => {
        loadError = err.message || String(err);
        throw new Error(`Failed to load plopfile at ${plopFile}: ${loadError}`);
      });
  }
  return plopReady;
}

export async function getGeneratorsMetadata() {
  const instance = await ensurePlop();
  const list = instance.getGeneratorList();
  return list.map((g: any) => {
    const gen = instance.getGenerator(g.name);
    const prompts =
      gen && gen.prompts
        ? gen.prompts.map((p: any) => ({
            name: p.name,
            type: p.type,
            message: p.message || null,
            choices: p.choices || null,
            default: p.default ?? null,
          }))
        : [];
    return {
      name: g.name,
      description: g.description || null,
      prompts,
    };
  });
}

export async function getGeneratorSchema(name: string) {
  const instance = await ensurePlop();
  const gen = instance.getGenerator(name);
  if (!gen) return null;
  const prompts = (gen.prompts || []).map((p: any) => ({
    name: p.name,
    type: p.type,
    message: p.message || null,
    choices: p.choices || null,
    default: p.default ?? null,
  }));
  return { name, prompts };
}

export async function runGenerator(
  generator: string,
  data: Record<string, unknown>,
) {
  const instance = await ensurePlop();
  const gen = instance.getGenerator(generator);
  if (!gen) return null;
  const results = await gen.runActions(data || {});
  return results;
}
