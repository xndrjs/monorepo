/** Minimal parser so markdown can be linted with text-only rules. */
const textParser = {
  meta: { name: "text-for-doc-todo" },
  parseForESLint(code) {
    const lineCount = code.split(/\r?\n/u).length;
    const ast = {
      type: "Program",
      body: [],
      sourceType: "module",
      range: [0, code.length],
      loc: {
        start: { line: 1, column: 0 },
        end: { line: lineCount, column: 0 },
      },
      tokens: [],
      comments: [],
    };

    return {
      ast,
      services: {},
      scopeManager: null,
      visitorKeys: { Program: [] },
    };
  },
};

/** @type {import("eslint").Rule.RuleModule} */
const noIncompleteDocTodo = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Warn on `TODO (doc)` placeholders left in application and package sources.",
    },
    messages: {
      incomplete:
        "Complete documentation: replace or remove the `TODO (doc)` placeholder.",
    },
    schema: [],
  },
  create(context) {
    const pattern = /(?:\/\/|<!--)\s*\/?\s*TODO\s*\(doc\)/gi;

    return {
      Program() {
        const source = context.sourceCode;
        const text = source.getText();

        for (const match of text.matchAll(pattern)) {
          const index = match.index ?? 0;
          context.report({
            loc: {
              start: source.getLocFromIndex(index),
              end: source.getLocFromIndex(index + match[0].length),
            },
            messageId: "incomplete",
          });
        }
      },
    };
  },
};

/** @type {import("eslint").ESLint.Plugin} */
export const incompleteDocTodoPlugin = {
  rules: {
    "no-placeholder": noIncompleteDocTodo,
  },
};

export const incompleteDocTodoMarkdownConfig = {
  files: ["apps/**/*.md", "packages/**/*.md"],
  languageOptions: {
    parser: textParser,
  },
};
