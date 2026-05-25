import type { PlopGenerator, PromptQuestion } from "node-plop/types/index.js";
import { getPlop } from "./load-plop.ts";
import type {
  RunFailure,
  RunGeneratorResult,
  ValidationError,
} from "./types.ts";

type PlopAnswers = Record<string, unknown>;

function getPromptName(prompt: PromptQuestion): string | undefined {
  return typeof prompt.name === "string" ? prompt.name : undefined;
}

async function resolvePrompts(
  generator: PlopGenerator,
): Promise<PromptQuestion[]> {
  const { prompts } = generator;

  if (Array.isArray(prompts)) {
    return prompts;
  }

  throw new Error(
    `Generator uses dynamic prompts; MCP only supports static prompt arrays.`,
  );
}

function promptApplies(prompt: PromptQuestion, answers: PlopAnswers): boolean {
  const when = prompt.when as
    | ((answers: PlopAnswers) => boolean | Promise<boolean>)
    | undefined;

  if (!when) {
    return true;
  }

  return Boolean(when(answers));
}

async function applyFilter(
  prompt: PromptQuestion,
  value: unknown,
  answers: PlopAnswers,
): Promise<unknown> {
  const filter = (
    prompt as { filter?: (value: unknown, answers?: PlopAnswers) => unknown }
  ).filter;

  if (!filter) {
    return value;
  }

  return filter(value, answers);
}

async function validateAnswer(
  prompt: PromptQuestion,
  value: unknown,
  answers: PlopAnswers,
): Promise<true | string> {
  const promptName = getPromptName(prompt) ?? "unknown";
  const validate = prompt.validate as
    | ((
        value: unknown,
        answers?: PlopAnswers,
      ) => true | string | Promise<true | string>)
    | undefined;

  if (!validate) {
    if (value === undefined || value === null || value === "") {
      return `${promptName} is required.`;
    }

    return true;
  }

  return validate(value, answers);
}

export async function prepareAnswers(
  generator: PlopGenerator,
  rawAnswers: Record<string, unknown>,
): Promise<{
  answers: PlopAnswers;
  validationErrors: ValidationError[];
}> {
  const prompts = await resolvePrompts(generator);
  const validationErrors: ValidationError[] = [];
  const answers: PlopAnswers = { ...rawAnswers };

  for (const prompt of prompts) {
    const promptName = getPromptName(prompt);
    if (!promptName) {
      continue;
    }

    if (!promptApplies(prompt, answers)) {
      continue;
    }

    let value = rawAnswers[promptName];

    if (value === undefined || value === null || value === "") {
      const defaultValue = (
        prompt as { default?: unknown | ((a: PlopAnswers) => unknown) }
      ).default;
      if (typeof defaultValue === "function") {
        value = defaultValue(answers);
        answers[promptName] = value;
      } else if (defaultValue !== undefined) {
        value = defaultValue;
        answers[promptName] = value;
      }
    }

    if (value === undefined || value === null || value === "") {
      validationErrors.push({
        field: promptName,
        message: `${promptName} is required.`,
      });
      continue;
    }

    value = await applyFilter(prompt, value, answers);
    answers[promptName] = value;

    const validation = await validateAnswer(prompt, value, answers);
    if (validation !== true) {
      validationErrors.push({ field: promptName, message: validation });
    }
  }

  return { answers, validationErrors };
}

export async function runGenerator(
  generatorName: string,
  rawAnswers: Record<string, unknown>,
): Promise<RunGeneratorResult> {
  const plop = await getPlop();
  const knownGenerators = plop.getGeneratorList().map((entry) => entry.name);

  if (!knownGenerators.includes(generatorName)) {
    return {
      success: false,
      changes: [],
      failures: [],
      validationErrors: [
        {
          field: "generator",
          message: `Unknown generator "${generatorName}". Known: ${knownGenerators.join(", ")}`,
        },
      ],
    };
  }

  const generator = plop.getGenerator(generatorName);
  const { answers, validationErrors } = await prepareAnswers(
    generator,
    rawAnswers,
  );

  if (validationErrors.length > 0) {
    return {
      success: false,
      changes: [],
      failures: [],
      validationErrors,
    };
  }

  const results = await generator.runActions(answers);

  const changes = results.changes.map((change) => change.path);
  const failures: RunFailure[] = results.failures.map((failure) => ({
    type: failure.type,
    path: failure.path,
    error: failure.error || failure.message,
  }));

  return {
    success: failures.length === 0,
    changes,
    failures,
  };
}
