---
name: clean-monorepo-boundaries
description: Troubleshoots eslint-plugin-boundaries and no-restricted-imports violations in the clean-template monorepo, or adds a newly installed framework/SDK package name to the core import-ban list in eslint.config.js. Use when fixing boundary or forbidden-import errors in packages/—not for general eslint.config.js refactors.
---

# Monorepo boundaries (ESLint)

## Workspace tooling policy

Editing global or package tooling to bypass errors is **forbidden** unless the user explicitly approves after you explain why.

**Do not change** (examples): `eslint.config.js` (beyond the narrow exception below), `tsconfig.json` / `tsconfig.base.json` / `tsconfig.eslint.json`, core package `tsconfig.json`, Prettier/Vitest config, path aliases, `boundaries/*`, `check-file` patterns.

**When stuck:** stop, describe the underlying conflict, propose a code or architecture fix, and ask the user—do not “fix” config in the same task.

See also router skill `clean-architecture-monorepo` — _Workspace tooling_.

## Canonical rules

Full layer matrix, element types, and philosophy:

[architecture/clean-architecture-oriented-monorepo.md](../../architecture/clean-architecture-oriented-monorepo.md) — sections _Architectural boundaries_ and _Hard bans_.

## Do not edit `eslint.config.js` (default)

**Strongly discouraged:** changing `boundaries/elements`, `boundaries/dependencies`, `check-file` patterns, or resolver settings to “make one import pass”.

**Fix the code** (move import, use public entrypoint, respect layer) or discuss an architecture change first.

Read `eslint.config.js` to **understand** why a rule fired—do not treat it as a routine edit surface.

## The one allowed `eslint.config.js` change

When the workspace adds a **framework** (e.g. React, Next) or **external SDK** (Contentful, DatoCMS, etc.) that must **never** be imported from `@core/*`, extend the core-package ban list:

**File:** `eslint.config.js`  
**Block:** `files: coreFiles` → `no-restricted-imports` → first `patterns` entry (framework/SDK group).

Current shape:

```js
{
  group: ["{next,react}{,/**}"],
  message:
    "Framework and SDK imports are forbidden in core packages. Depend on ports instead.",
},
```

**When to update:** a new framework or SDK package is added to the monorepo (typically root or app `package.json`) and core developers must not import it directly.

**How to update:** add the **npm package name** to the brace group (same style as `next` and `react`), e.g. `{next,react,contentful}{,/**}` if `contentful` is the import specifier apps use.

**Do not use this** to ban `@infrastructure/*` or `@ui/*`—those have dedicated patterns below the framework group.

After editing: `pnpm lint` on a core file that would import the new package (should fail) and on a compliant core file (should pass).

## Troubleshooting violations (preferred work)

| Error                                       | Typical fix                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------- |
| `boundaries/dependencies`                   | Import only from allowed layers; use `@core/<feature>/models` not deep paths      |
| `no-restricted-imports` + infrastructure/ui | Remove import from core; wire via port + infrastructure in `composition/`         |
| `no-restricted-imports` + react/next/sdk    | Remove framework/SDK from core; use port abstraction                              |
| `check-file/filename-blocklist`             | Rename to `*.shape.ts`, `*.primitive.ts`, `*.proof.ts`, `*.capabilities.ts`, etc. |

Resolver issues (alias not resolved): verify paths in `tsconfig.base.json` / `tsconfig.eslint.json` match the intended layout—**do not** edit tsconfig or ESLint to silence one file; stop and ask the user if alignment requires a structural change.

## Rules reference (read-only)

### Dependency matrix

Aligned with `eslint.config.js` / architecture:

| From              | May import                                                                            |
| ----------------- | ------------------------------------------------------------------------------------- |
| `core-errors`     | `core-errors`                                                                         |
| `core-models`     | `core-models`, `core-errors`                                                          |
| `core-operations` | `core-models`, `core-operations`, `core-errors`                                       |
| `core-ports`      | `core-models`, `core-ports`, `core-errors`                                            |
| `core-use-cases`  | `core-models`, `core-operations`, `core-ports`, `core-use-cases`, `core-errors`       |
| `infrastructure`  | `core-models`, `core-ports`, `core-errors`, `infrastructure`                          |
| `ui`              | `ui`                                                                                  |
| `app-composition` | app, composition, all core layers, infrastructure, ui                                 |
| `app`             | app, composition, `core-models`, `core-ports`, `core-errors`, ui; use-cases type-only |

### Core `no-restricted-imports` (besides framework/SDK group)

- `@infrastructure/*`, `@infrastructure/*/**`
- `@ui/*`, `@ui/*/**`

### Infra / UI path depth

Do **not** add path-depth bans for `@infrastructure/*` or `@ui/*` globally—each package owns its `exports`.

### Infrastructure import allowlist

`clean-template/infrastructure-prefix-boundary` uses an explicit directed allowlist in `eslint.config.js`:

```js
{
  allow: [
    {
      from: "@infrastructure/http-rest-feature",
      to: ["@infrastructure/http-rest", "@infrastructure/http"], // ok — each to is a prefix of from
    },
    // { from: "@infrastructure/http", to: ["@infrastructure/http-rest-feature"] }, // rejected — to is not a prefix of from
  ],
}
```

- Default `allow: []` → no cross-package `@infrastructure/*` imports (same package always ok).
- Package ids are full (`@infrastructure/<name>`); subpath imports resolve to the package root.
- Every `to` **must** be a string prefix of `from` (directed); invalid entries are reported by the rule.
- Extend the list with user approval when a context adapter may import a shared technology package.

### Severity

- `boundaries/dependencies`: **error**
- `boundaries/no-unknown`, `no-unknown-files`: **warn**

### Filename patterns (`check-file`)

| Path                          | Allowed                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `packages/core-*/models/`     | `*.shape.ts`, `*.primitive.ts`, `*.proof.ts`, colocated `*.test.ts`, `index.ts` |
| `packages/core-*/errors/`     | `*.error.ts`, `index.ts`                                                        |
| `packages/core-*/operations/` | `*.capabilities.ts`, `*.service.ts`, colocated `*.test.ts`, `index.ts`          |
| `packages/core-*/use-cases/`  | `*.use-case.ts`, `*.use-case.test.ts`, `index.ts`                               |
| `packages/core-*/ports/`      | `*.port.ts`, `index.ts`                                                         |

## If architecture truly changes

New package **kind** (not a new npm name), new layer, or new dependency matrix → update [architecture doc](../../architecture/clean-architecture-oriented-monorepo.md) **first**, then `eslint.config.js` in a dedicated change with team agreement—not as a drive-by lint fix.
