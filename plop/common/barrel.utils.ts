export function appendExport(source: string, exportLine: string): string {
  const lines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && line !== "export {};");

  if (!lines.includes(exportLine)) {
    lines.push(exportLine);
  }

  return `${lines.sort().join("\n")}\n`;
}
