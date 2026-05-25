export type PromptChoice = {
  label: string;
  value: string;
};

export type PromptWhenRequirement = {
  requires: Record<string, unknown>;
};

export type PromptSchema = {
  name: string;
  type: string;
  message: string;
  choices?: PromptChoice[];
  default?: unknown;
  required: boolean;
  when?: PromptWhenRequirement;
};

export type GeneratorDescription = {
  name: string;
  description: string;
  prompts: PromptSchema[];
};

export type ValidationError = {
  field: string;
  message: string;
};

export type RunFailure = {
  type: string;
  path: string;
  error: string;
};

export type RunGeneratorResult = {
  success: boolean;
  changes: string[];
  failures: RunFailure[];
  validationErrors?: ValidationError[];
};
