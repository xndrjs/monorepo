import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { describeGenerator, listGenerators } from "./describe-generator.ts";
import { runGenerator } from "./run-generator.ts";

const server = new McpServer({
  name: "plop",
  version: "1.0.0",
});

server.registerTool(
  "plop_list_generators",
  {
    description:
      "List all Plop generators available in this monorepo (core-feature, shape, port, use-case, etc.).",
    inputSchema: z.object({}),
  },
  async () => {
    const generators = await listGenerators();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ generators }, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "plop_describe_generator",
  {
    description:
      "Describe prompts and list choices for a Plop generator. Use list `value` fields in plop_run_generator (not display labels).",
    inputSchema: z.object({
      generator: z
        .string()
        .describe("Generator name, e.g. shape, port, core-feature"),
    }),
  },
  async ({ generator }) => {
    const description = await describeGenerator(generator);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(description, null, 2),
        },
      ],
    };
  },
);

server.registerTool(
  "plop_run_generator",
  {
    description:
      "Run a Plop generator non-interactively with the given answers object.",
    inputSchema: z.object({
      generator: z.string().describe("Generator name"),
      answers: z
        .record(z.string(), z.unknown())
        .describe("Prompt answers keyed by prompt name"),
    }),
  },
  async ({ generator, answers }) => {
    const result = await runGenerator(generator, answers);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
