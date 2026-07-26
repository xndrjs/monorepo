/** @type {import("eslint").Rule.RuleModule} */
export const noTodoDocMarker = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow scaffold documentation markers until the doc block is complete.",
    },
    schema: [],
    messages: {
      found:
        "Documentation TODO (doc) marker still present — complete the doc and remove it.",
    },
  },
  create(context) {
    const source = context.sourceCode;
    const pattern = /TODO\s+\(doc\)/gi;

    function reportTodoDocMarkers() {
      const text = source.getText();

      for (const match of text.matchAll(pattern)) {
        const index = match.index ?? 0;
        const start = source.getLocFromIndex(index);
        const end = source.getLocFromIndex(index + match[0].length);

        context.report({
          loc: { start, end },
          messageId: "found",
        });
      }
    }

    return {
      Program: reportTodoDocMarkers,
      root: reportTodoDocMarkers,
    };
  },
};
