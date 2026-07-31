/**
 * Whether `to` is a string prefix of `from` (directed; no separator assumed).
 * Examples:
 * - from "http-rest-feature", to "http-rest" → true
 * - from "http-rest-feature", to "http" → true
 * - from "http", to "http-rest-feature" → false
 * - from "s3-somefeature", to "contentful" → false
 *
 * @param {string} from
 * @param {string} to
 * @returns {boolean}
 */
export function isInfrastructurePrefixTarget(from, to) {
  if (!from || !to) {
    return false;
  }

  return from.startsWith(to);
}

/**
 * Normalize an allowlist package id to `@infrastructure/<token>`.
 * Accepts `@infrastructure/s3` or `s3`; rejects subpaths.
 *
 * @param {unknown} value
 * @returns {string | null} package id or null if invalid
 */
export function normalizeInfrastructurePackageId(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const withScope = trimmed.startsWith("@infrastructure/")
    ? trimmed
    : `@infrastructure/${trimmed}`;

  if (withScope.includes("/", "@infrastructure/".length)) {
    return null;
  }

  const token = withScope.slice("@infrastructure/".length);
  if (!/^[a-z][a-z0-9-]*$/.test(token)) {
    return null;
  }

  return `@infrastructure/${token}`;
}

/**
 * Extract `@infrastructure/<token>` from an import path (subpaths allowed).
 *
 * @param {string} importPath
 * @returns {string | null}
 */
export function getTargetPackageId(importPath) {
  if (!importPath.startsWith("@infrastructure/")) {
    return null;
  }

  const rest = importPath.slice("@infrastructure/".length);
  const [token] = rest.split("/");
  if (!token) {
    return null;
  }

  return `@infrastructure/${token}`;
}

/**
 * Extract `@infrastructure/<token>` from a filename under packages/infrastructure-*.
 *
 * @param {string} filename
 * @returns {string | null}
 */
export function getSourcePackageId(filename) {
  const match = filename.match(
    /(?:^|[/\\])packages[/\\]infrastructure-([^/\\]+)(?:[/\\]|$)/,
  );

  if (!match?.[1]) {
    return null;
  }

  return `@infrastructure/${match[1]}`;
}

/**
 * @param {unknown} options
 * @returns {{
 *   allowByFrom: Map<string, Set<string>>,
 *   invalidEntries: Array<{ from: string, to: string, reason: string }>,
 * }}
 */
export function parseAllowOptions(options) {
  /** @type {Map<string, Set<string>>} */
  const allowByFrom = new Map();
  /** @type {Array<{ from: string, to: string, reason: string }>} */
  const invalidEntries = [];

  const rawAllow = Array.isArray(options?.allow) ? options.allow : [];

  for (const entry of rawAllow) {
    if (!entry || typeof entry !== "object") {
      invalidEntries.push({
        from: String(entry),
        to: "",
        reason: "Allow entry must be an object with from/to.",
      });
      continue;
    }

    const fromId = normalizeInfrastructurePackageId(entry.from);
    if (!fromId) {
      invalidEntries.push({
        from: String(entry.from ?? ""),
        to: "",
        reason: 'Invalid "from". Use "@infrastructure/<name>" (no subpaths).',
      });
      continue;
    }

    const toList = Array.isArray(entry.to) ? entry.to : null;
    if (!toList) {
      invalidEntries.push({
        from: fromId,
        to: "",
        reason: '"to" must be an array of "@infrastructure/<name>" ids.',
      });
      continue;
    }

    const fromToken = fromId.slice("@infrastructure/".length);
    let allowed = allowByFrom.get(fromId);
    if (!allowed) {
      allowed = new Set();
      allowByFrom.set(fromId, allowed);
    }

    for (const rawTo of toList) {
      const toId = normalizeInfrastructurePackageId(rawTo);
      if (!toId) {
        invalidEntries.push({
          from: fromId,
          to: String(rawTo ?? ""),
          reason:
            'Invalid "to" entry. Use "@infrastructure/<name>" (no subpaths).',
        });
        continue;
      }

      const toToken = toId.slice("@infrastructure/".length);
      if (!isInfrastructurePrefixTarget(fromToken, toToken)) {
        invalidEntries.push({
          from: fromId,
          to: toId,
          reason:
            '"to" must be a string prefix of "from" (e.g. from @infrastructure/http-rest-feature to @infrastructure/http-rest or @infrastructure/http).',
        });
        continue;
      }

      allowed.add(toId);
    }
  }

  return { allowByFrom, invalidEntries };
}

/** @type {import("eslint").Rule.RuleModule} */
export const infrastructurePrefixBoundary = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Allow @infrastructure cross-package imports only via an explicit allowlist; each allowed target must be a string prefix of the source package name.",
    },
    schema: [
      {
        type: "object",
        properties: {
          allow: {
            type: "array",
            items: {
              type: "object",
              properties: {
                from: { type: "string", minLength: 1 },
                to: {
                  type: "array",
                  items: { type: "string", minLength: 1 },
                  uniqueItems: true,
                },
              },
              required: ["from", "to"],
              additionalProperties: false,
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      invalidAllowEntry:
        'Invalid infrastructure allowlist entry from "{{from}}" to "{{to}}": {{reason}}',
      notAllowed:
        'Infrastructure package \'{{sourcePackage}}\' cannot import \'{{targetPackage}}\'. Add { from: "{{sourcePackage}}", to: ["{{targetPackage}}"] } to clean-template/infrastructure-prefix-boundary ("to" must be a string prefix of "from").',
    },
  },
  create(context) {
    const { allowByFrom, invalidEntries } = parseAllowOptions(
      context.options?.[0] ?? {},
    );

    const sourcePackageId = getSourcePackageId(context.filename);
    if (!sourcePackageId) {
      return {};
    }

    let reportedInvalidConfig = false;

    /**
     * @param {import("estree").Node} node
     */
    function reportInvalidConfig(node) {
      if (reportedInvalidConfig || invalidEntries.length === 0) {
        return;
      }
      reportedInvalidConfig = true;
      for (const entry of invalidEntries) {
        context.report({
          node,
          messageId: "invalidAllowEntry",
          data: {
            from: entry.from || "(invalid)",
            to: entry.to || "(invalid)",
            reason: entry.reason,
          },
        });
      }
    }

    /**
     * @param {import("estree").Node} node
     * @param {string} importPath
     */
    function checkImport(node, importPath) {
      const targetPackageId = getTargetPackageId(importPath);
      if (!targetPackageId) {
        return;
      }

      if (targetPackageId === sourcePackageId) {
        return;
      }

      const allowedTargets = allowByFrom.get(sourcePackageId);
      if (allowedTargets?.has(targetPackageId)) {
        return;
      }

      context.report({
        node,
        messageId: "notAllowed",
        data: {
          sourcePackage: sourcePackageId,
          targetPackage: targetPackageId,
        },
      });
    }

    return {
      Program(node) {
        reportInvalidConfig(node);
      },
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
