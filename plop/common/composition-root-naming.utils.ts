import { parse } from "node:path";

import { toPascalCase } from "./casing.utils.ts";

export function infrastructureExportName(
  serverOnly: boolean,
  clientOnly: boolean,
): string {
  if (serverOnly) {
    return "getServerInfrastructure";
  }

  if (clientOnly) {
    return "getClientInfrastructure";
  }

  return "getInfrastructure";
}

/** e.g. `web-server.composition.ts` → `getWebServerRoot` */
export function compositionRootExportName(
  compositionRootFileName: string,
): string {
  const stem = parse(compositionRootFileName).name.replace(
    /\.composition$/,
    "",
  );

  return `get${toPascalCase(stem)}Root`;
}
