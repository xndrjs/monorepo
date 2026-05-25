import type { PlopGenerator, PromptQuestion } from "node-plop/types/index.js";
import { getPlop } from "./load-plop.ts";
import type {
  GeneratorDescription,
  PromptChoice,
  PromptSchema,
  PromptWhenRequirement,
} from "./types.ts";

type PlopAnswers = Record<string, unknown>;

type InquirerChoice = string | { name?: string; value: string; short?: string };

type ListPromptWithChoices = {
  name: string;
  type: "list";
  choices: InquirerChoice[];
};

function getListPromptChoices(
  prompt: PromptQuestion,
): InquirerChoice[] | undefined {
  if (prompt.type !== "list") {
    return undefined;
  }

  const choices = (prompt as { choices?: InquirerChoice[] }).choices;
  return Array.isArray(choices) ? choices : undefined;
}

function asListPromptWithChoices(
  prompt: PromptQuestion,
): ListPromptWithChoices | undefined {
  if (prompt.type !== "list" || typeof prompt.name !== "string") {
    return undefined;
  }

  const choices = getListPromptChoices(prompt);
  if (!choices) {
    return undefined;
  }

  return { name: prompt.name, type: "list", choices };
}

function normalizeChoices(
  choices: InquirerChoice[] | undefined,
): PromptChoice[] | undefined {
  if (!choices?.length) {
    return undefined;
  }

  return choices.map((choice) => {
    if (typeof choice === "string") {
      return { label: choice, value: choice };
    }

    const value = String(choice.value);
    const label = choice.name ?? value;
    return { label, value };
  });
}

function resolveDefault(
  prompt: PromptQuestion,
  answers: PlopAnswers,
): unknown | undefined {
  const { default: defaultValue } = prompt as {
    default?: unknown | ((answers: PlopAnswers) => unknown);
  };

  if (typeof defaultValue === "function") {
    return defaultValue(answers);
  }

  return defaultValue;
}

function inferWhenRequirement(
  when: ((answers: PlopAnswers) => boolean | Promise<boolean>) | undefined,
  prompts: PromptQuestion[],
): PromptWhenRequirement | undefined {
  if (!when) {
    return undefined;
  }

  const listPrompts = prompts
    .map(asListPromptWithChoices)
    .filter((prompt): prompt is ListPromptWithChoices => prompt !== undefined);

  for (const listPrompt of listPrompts) {
    const choices = normalizeChoices(listPrompt.choices) ?? [];

    for (const choice of choices) {
      const candidateAnswers = { [listPrompt.name]: choice.value };
      if (when(candidateAnswers)) {
        return { requires: candidateAnswers };
      }
    }
  }

  return undefined;
}

function toPromptSchema(
  prompt: PromptQuestion,
  allPrompts: PromptQuestion[],
): PromptSchema {
  const choices = normalizeChoices(getListPromptChoices(prompt));
  const whenFn = prompt.when as
    | ((answers: PlopAnswers) => boolean | Promise<boolean>)
    | undefined;

  const promptName = typeof prompt.name === "string" ? prompt.name : "unknown";

  const schema: PromptSchema = {
    name: promptName,
    type: typeof prompt.type === "string" ? prompt.type : "input",
    message:
      "message" in prompt && prompt.message !== undefined
        ? String(prompt.message)
        : promptName,
    required: whenFn ? false : true,
  };

  if (choices) {
    schema.choices = choices;
  }

  const defaultValue = resolveDefault(prompt, {});
  if (defaultValue !== undefined) {
    schema.default = defaultValue;
  }

  const whenRequirement = inferWhenRequirement(whenFn, allPrompts);
  if (whenRequirement) {
    schema.when = whenRequirement;
    schema.required = false;
  }

  return schema;
}

async function resolvePrompts(
  generator: PlopGenerator,
): Promise<PromptQuestion[]> {
  const { prompts } = generator;

  if (Array.isArray(prompts)) {
    return prompts;
  }

  throw new Error(
    `Generator "${generator.description}" uses dynamic prompts; MCP only supports static prompt arrays.`,
  );
}

export async function listGenerators(): Promise<
  { name: string; description: string }[]
> {
  const plop = await getPlop();
  return plop.getGeneratorList();
}

export async function describeGenerator(
  generatorName: string,
): Promise<GeneratorDescription> {
  const plop = await getPlop();
  const generator = plop.getGenerator(generatorName);
  const prompts = await resolvePrompts(generator);

  return {
    name: generatorName,
    description: generator.description,
    prompts: prompts.map((prompt) => toPromptSchema(prompt, prompts)),
  };
}
