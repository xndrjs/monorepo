import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { syncRootTsconfigReferences } from "../common/tsconfig-references.utils.ts";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../..");

const { paths, changed } = syncRootTsconfigReferences(rootDir);

if (paths.length === 0) {
  console.log(
    changed
      ? "Cleared tsconfig.json references (no app/package tsconfig projects found)"
      : "tsconfig.json references already up to date (no projects)",
  );
} else {
  console.log(
    changed
      ? `Updated tsconfig.json references (${paths.length} projects)`
      : `tsconfig.json references already up to date (${paths.length} projects)`,
  );
}
