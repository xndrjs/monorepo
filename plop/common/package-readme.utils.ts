import type { ActionType } from "plop";

/** Scoped npm name (e.g. `@core/billing`). Uses `scopedPackageName` to avoid clobbering by prompt `packageName`. */
export function createPackageReadmeAction(
  path: string,
  scopedPackageName: string,
): ActionType {
  return {
    type: "add",
    path,
    templateFile: "templates/package-readme/README.md.hbs",
    data: { scopedPackageName },
    abortOnFail: true,
  };
}
