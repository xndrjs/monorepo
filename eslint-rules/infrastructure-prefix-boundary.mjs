/**
 * Resolve a family from an infrastructure package token.
 * Examples:
 * - token: "s3-content-migration", family: "s3"
 * - token: "file-system-content-migration", family: "file-system"
 *
 * The longest matching family wins so compound families like "file-system"
 * are handled correctly.
 *
 * @param {string} token
 * @param {string[]} allowedFamilies
 * @returns {string | null}
 */
function resolveFamily(token, allowedFamilies) {
  const matches = allowedFamilies
    .filter((family) => token === family || token.startsWith(`${family}-`))
    .sort((a, b) => b.length - a.length);

  return matches[0] ?? null;
}

/**
 * Extract infrastructure package token from import path.
 * Examples:
 * - "@infrastructure/s3" -> "s3"
 * - "@infrastructure/s3/clients" -> "s3"
 * - "@infrastructure/file-system-content-migration/adapters" -> "file-system-content-migration"
 *
 * @param {string} importPath
 * @returns {string | null}
 */
function getTargetToken(importPath) {
  if (!importPath.startsWith("@infrastructure/")) {
    return null;
  }

  const rest = importPath.slice("@infrastructure/".length);
  const [token] = rest.split("/");

  return token || null;
}

/**
 * Extract infrastructure package token from filename.
 * Example:
 * - "/repo/packages/infrastructure-s3-content-migration/adapters/x.ts"
 *   -> "s3-content-migration"
 *
 * @param {string} filename
 * @returns {string | null}
 */
function getSourceToken(filename) {
  const match = filename.match(
    /(?:^|[/\\])packages[/\\]infrastructure-([^/\\]+)(?:[/\\]|$)/,
  );

  return match?.[1] ?? null;
}

/** @type {import("eslint").Rule.RuleModule} */
export const infrastructurePrefixBoundary = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Allow @infrastructure imports only within the same configured package family.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allowedFamilies: {
            type: "array",
            items: { type: "string", minLength: 1 },
            minItems: 1,
            uniqueItems: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unknownSourceFamily:
        "Unable to resolve a family for source infrastructure package '{{sourcePackage}}'. Add it to allowedFamilies.",
      unknownTargetFamily:
        "Unable to resolve a family for target infrastructure package '{{targetPackage}}'. Add it to allowedFamilies.",
      crossFamily:
        "Cross-family infrastructure import is forbidden: '{{sourcePackage}}' (family '{{sourceFamily}}') cannot import '{{targetPackage}}' (family '{{targetFamily}}').",
    },
  },
  create(context) {
    const options = context.options?.[0] ?? {};
    const allowedFamilies = Array.isArray(options.allowedFamilies)
      ? options.allowedFamilies
      : [];

    const sourceToken = getSourceToken(context.filename);
    if (!sourceToken) {
      return {};
    }

    const sourceFamily = resolveFamily(sourceToken, allowedFamilies);

    /**
     * @param {import("estree").Node} node
     * @param {string} importPath
     */
    function checkImport(node, importPath) {
      const targetToken = getTargetToken(importPath);
      if (!targetToken) {
        return;
      }

      if (!sourceFamily) {
        context.report({
          node,
          messageId: "unknownSourceFamily",
          data: {
            sourcePackage: sourceToken,
          },
        });
        return;
      }

      const targetFamily = resolveFamily(targetToken, allowedFamilies);

      if (!targetFamily) {
        context.report({
          node,
          messageId: "unknownTargetFamily",
          data: {
            targetPackage: targetToken,
          },
        });
        return;
      }

      if (sourceFamily !== targetFamily) {
        context.report({
          node,
          messageId: "crossFamily",
          data: {
            sourcePackage: sourceToken,
            sourceFamily,
            targetPackage: targetToken,
            targetFamily,
          },
        });
      }
    }

    return {
      ImportDeclaration(node) {
        if (typeof node.source?.value !== "string") {
          return;
        }

        checkImport(node.source, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (!node.source || typeof node.source.value !== "string") {
          return;
        }

        checkImport(node.source, node.source.value);
      },
      ExportAllDeclaration(node) {
        if (typeof node.source?.value !== "string") {
          return;
        }

        checkImport(node.source, node.source.value);
      },
    };
  },
};
