import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getGeneratorsMetadata,
  getGeneratorSchema,
  runGenerator,
  repoRoot,
} from "./plopService.js";
import {
  scanUtilsDirs,
  listModuleExports,
  callModuleFunction,
} from "./utilsLoader.js";

const modulesMap = scanUtilsDirs(repoRoot);

function textResult(payload: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text:
          typeof payload === "string"
            ? payload
            : JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

const mcpServer = new McpServer(
  {
    name: "clean-monorepo-plop",
    version: "0.1.0",
  },
  {
    instructions: [
      "MCP tools for Plop generators in the clean-architecture-monorepo template.",
      "Workflow: list_generators → get_generator_schema → run_generator with prompt answers.",
      "Domain kits: primitive, shape, capabilities, proof, domain-error (not core-model).",
      `Repository root: ${repoRoot}`,
    ].join(" "),
  },
);

mcpServer.registerTool(
  "list_generators",
  {
    description:
      "List all Plop generators with name, description, and prompt metadata.",
    inputSchema: {},
  },
  async () => {
    try {
      return textResult(await getGeneratorsMetadata());
    } catch (err: unknown) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  },
);

mcpServer.registerTool(
  "get_generator_schema",
  {
    description: "Get the prompt schema for a single Plop generator by name.",
    inputSchema: {
      name: z
        .string()
        .describe(
          "Generator name (e.g. shape, primitive, proof, domain-error, composition-root)",
        ),
    },
  },
  async ({ name }) => {
    try {
      const schema = await getGeneratorSchema(name);
      if (!schema) return toolError(`Generator not found: ${name}`);
      return textResult(schema);
    } catch (err: unknown) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  },
);

mcpServer.registerTool(
  "run_generator",
  {
    description:
      "Run a Plop generator non-interactively. Pass prompt answers in data.",
    inputSchema: {
      generator: z
        .string()
        .describe(
          "Generator name (e.g. shape, primitive, proof, domain-error, composition-root)",
        ),
      data: z
        .record(z.unknown())
        .optional()
        .describe("Prompt answers keyed by prompt name"),
    },
  },
  async ({ generator, data }) => {
    try {
      const results = await runGenerator(generator, data ?? {});
      if (results === null)
        return toolError(`Generator not found: ${generator}`);
      return textResult({ generator, results });
    } catch (err: unknown) {
      return toolError(err instanceof Error ? err.message : String(err));
    }
  },
);

mcpServer.registerTool(
  "list_utils_modules",
  {
    description:
      "List plop helper modules (under plop/generators and plop/common) exposed for dynamic values.",
    inputSchema: {},
  },
  async () => textResult(Object.keys(modulesMap)),
);

mcpServer.registerTool(
  "list_utils_functions",
  {
    description: "List exported functions from a plop utils module.",
    inputSchema: {
      module: z.string().describe("Module name from list_utils_modules"),
    },
  },
  async ({ module: mod }) => {
    const modulePath = modulesMap[mod];
    if (!modulePath) return toolError(`Module not found: ${mod}`);
    return textResult({
      module: mod,
      functions: listModuleExports(modulePath),
    });
  },
);

mcpServer.registerTool(
  "call_utils_function",
  {
    description: "Invoke an exported helper from a plop utils module.",
    inputSchema: {
      module: z.string().describe("Module name"),
      fn: z.string().describe("Function name"),
      args: z.unknown().optional().describe("Argument passed to the function"),
    },
  },
  async ({ module: mod, fn, args }) => {
    const modulePath = modulesMap[mod];
    if (!modulePath) return toolError(`Module not found: ${mod}`);
    const result = await callModuleFunction(modulePath, fn, args);
    if (!result.ok) return toolError(result.error ?? "Unknown error");
    return textResult(result.result);
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed:", error);
  process.exit(1);
});
