# Clean Architecture Oriented Monorepo

Monorepo for fullstack TypeScript projects oriented around clean architecture.

The base structure is:

```txt
apps/
packages/
architecture/
```

`apps/` contains deployable or executable applications. `packages/` contains internal packages, split between core packages and infrastructure packages.

## Tooling

The workspace uses:

- `pnpm` for workspace and dependency management;
- TypeScript with `moduleResolution: "Bundler"`;
- centralized ESLint flat config;
- Prettier for formatting.

Main commands:

```sh
pnpm lint
pnpm format
pnpm format:check
pnpm typecheck
pnpm test
```

## TypeScript project references

Root `tsconfig.json` is a **solution** config: it has `"files": []` and a `references` array listing every app or package that owns a `tsconfig.json` under `apps/*` or `packages/*`. `pnpm typecheck` runs `tsc -b` against that graph.

**Keeping references in sync**

| Event                                                                | What to do                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Scaffold `@core`, `@infrastructure`, or `@ui` package                | Automatic — `core-feature`, `infrastructure-package`, and `ui-package` regenerate `references` after create |
| Add an app manually (e.g. Vite SPA) with `apps/<name>/tsconfig.json` | Run `pnpm sync-tsconfig-references` (also runs on `pnpm install` via `postinstall`)                         |
| Remove an app or package folder                                      | Run `pnpm sync-tsconfig-references` so the deleted path is removed from `references`                        |

Do not hand-edit `references` unless you are fixing a generator bug — prefer sync so the list stays complete and sorted.

```sh
pnpm sync-tsconfig-references
```

## Testing

Vitest is configured at the root level in `vitest.config.ts`.

The root config defines two initial test profiles:

- `node`: default profile for core packages, infrastructure packages, CLI code, utilities, and generators.
- `react`: `jsdom` profile for React/UI tests in apps or UI-oriented packages.

Commands:

```sh
pnpm test
pnpm test:watch
pnpm test:node
pnpm test:react
```

The template currently allows running tests with no test files present. This keeps the empty monorepo verifiable while packages and apps are being scaffolded.

## Git Hooks

Husky runs `lint-staged` on `pre-commit`.

The hook formats and lints only staged files:

- Prettier runs on staged code, JSON, Markdown, and YAML files.
- ESLint runs with `--fix` on staged JavaScript and TypeScript files.

Full test and typecheck commands are intentionally left to CI.

## Generators

The workspace uses Plop for local code generation.

Plop files live under `plop/`:

```txt
plop/
  common/
  generators/
  templates/
  plopfile.cjs
```

`plop/plopfile.cjs` is only the Plop entrypoint. Generator implementations should live in dedicated files, preferably TypeScript files.

Run:

```sh
pnpm generate
```

Available generators:

- `core-feature`: creates a `@core/<feature>` package under `packages/core-<feature>` with `@xndrjs/domain` + `@xndrjs/domain-zod` (no `foundation/`).
- `primitive` / `shape` / `proof`: domain kits under an existing core package (`*.primitive.ts`, `*.shape.ts`, `*.proof.ts`).
- `capabilities`: domain capabilities (`forShape` / `forPrimitive`; `.attach` is manual) under an existing core package.
- `domain-error`: domain error class under `errors/` (`*.error.ts`).
- `core-port`: creates a port interface under an existing core package.
- `core-use-case`: creates a use case under an existing core package.
- `composition-root`: creates a composition root file under an existing app.
- `infrastructure-package`: creates an `@infrastructure/<name>` package.
- `infrastructure-loader`: creates a loader under an existing infrastructure package (`loaders/<name>.loader.ts`).
- `infrastructure-repository`: creates a repository wired to an existing loader, domain kit (shape), and port; can scaffold a mapper if missing.
- `ui-package`: creates a `@ui/<name>` package (importable from apps only).

Root `tsconfig.json` `references` are synced by `pnpm sync-tsconfig-references` (see [TypeScript project references](#typescript-project-references)), not by a Plop generator.

Example:

```sh
pnpm generate core-feature
pnpm generate primitive
pnpm generate shape
pnpm generate proof
pnpm generate capabilities
pnpm generate domain-error
pnpm generate core-port
pnpm generate core-use-case
pnpm generate infrastructure-package
pnpm generate infrastructure-loader
pnpm generate infrastructure-repository
pnpm generate ui-package
# apps/<name>/ is manual (package.json + tsconfig), then:
pnpm generate composition-root
```

The generated core package has the fixed layer structure:

```txt
packages/core-billing/
  errors/
    index.ts
  models/
    index.ts
  operations/
    index.ts
  use-cases/
    index.ts
  ports/
    index.ts
  package.json
  tsconfig.json
```

The generated `package.json` exposes only the allowed public entrypoints:

```json
{
  "exports": {
    "./models": "./models/index.ts",
    "./operations": "./operations/index.ts",
    "./use-cases": "./use-cases/index.ts",
    "./ports": "./ports/index.ts",
    "./errors": "./errors/index.ts"
  }
}
```

The `infrastructure-package` generator asks for a package name and creates:

```txt
packages/infrastructure-contentful/
  index.ts
  package.json
  tsconfig.json
```

The generated package is named `@infrastructure/<name>` and exposes a single root entrypoint:

```json
{
  "exports": {
    ".": "./index.ts"
  }
}
```

The `infrastructure-loader` generator asks for an existing infrastructure package and a loader name. It scaffolds `loaders/{{name}}.loader.ts` with `Raw*` types and `get` / `getMany` — no `@core/*` imports. Run this **before** `infrastructure-repository`.

The `infrastructure-repository` generator wires a repository to an existing **domain kit** (core shape) and **loader** (infra). **Port** and **mapper** can be picked from existing files or created inline (empty `XxxPort` in core; mapper in infra). Prompt order: core package → shape → infrastructure package → loader → mapper → port → repository name.

In the recommended pattern, loaders fetch and cache/batch the **raw infrastructure shape** once (for example with DataLoader), while repositories project that raw shape into **application-specific domain read models** for each `@core/*` feature. It is valid to have multiple repositories in different cores mapping the same raw record into different domain kits.

See [architecture/infrastructure-loader-repository-pattern.md](./architecture/infrastructure-loader-repository-pattern.md).

The `ui-package` generator asks for a package name and optionally scaffolds a minimal Vitest test (`react` or `node` project from the root `vitest.config.ts`, default `react`):

```txt
packages/ui-react/
  index.ts
  index.test.tsx
  package.json
  tsconfig.json
```

The generated package is named `@ui/<name>` and exposes a single root entrypoint. ESLint allows `@ui/*` imports only from `apps/*` (including `composition/`).

Domain kits use `@xndrjs/domain-zod`. Suggested order after `core-feature`: `primitive` → `shape` → `proof` → `capabilities`. Domain errors live under `errors/` (not `models/`).

```txt
packages/core-billing/models/email.primitive.ts
packages/core-billing/models/user.shape.ts
packages/core-billing/models/verified-user.proof.ts
packages/core-billing/operations/user.capabilities.ts
packages/core-billing/errors/user-not-found.error.ts
```

The `capabilities` generator asks for an existing core package, a name, and a base type (`shape` or `primitive`). It scaffolds `{{name}}.capabilities.ts` with `{{Name}}Capabilities` (`forShape` / `forPrimitive`). Wire `.attach(XxxShape|Primitive)` manually after generate.

The `domain-error` generator asks for an existing core package, an error name, code, and message. It scaffolds `errors/{{name}}.error.ts` and updates the `errors/index.ts` barrel.

The `core-port` generator asks for an existing core package and a **role** name (not a vendor—e.g. `cms` → `CmsPort`, not `contentful`).
The file name is normalized to kebab-case with the `.port.ts` suffix:

```txt
packages/core-pagebuilder/ports/page-routing.port.ts
```

It creates an empty `XxxPort` interface and updates the public `ports/index.ts` barrel. Naming and hard gates: skill `clean-monorepo-core-ports`.

The `core-use-case` generator asks for an existing core package and a use case name.
The file name is normalized to kebab-case with the `.use-case.ts` suffix:

```txt
packages/core-pagebuilder/use-cases/create-page.use-case.ts
packages/core-pagebuilder/use-cases/create-page.use-case.test.ts
```

It also updates the public `use-cases/index.ts` barrel and scaffolds a Vitest test for the `node` project (`pnpm test:node`).

The `composition-root` generator asks for an existing app (with `package.json`), whether the module is **server-only** or **client-only**, and a composition root file name. There is no app generator—scaffold `apps/<name>/` manually first.

- Default file name: `<app-name>.composition.ts`
- Server-only default: `<app-name>-server.composition.ts` (adds `import "server-only"` and the `server-only` dependency on the app)
- Client-only default: `<app-name>-client.composition.ts` (adds `import "client-only"` and the `client-only` dependency on the app)

It creates the app-level `composition/` folder if it does not exist. Prefer **one file per runtime** (not per `@core` feature):

```txt
apps/web-next/
  composition/
    web-next.composition.ts          # isomorphic wiring
    web-next-server.composition.ts   # all server wiring
    web-next-client.composition.ts   # optional client wiring
```

If the target composition root file already exists, generation fails—add new use-case wiring to the existing runtime file instead.

Generated modules export `get<Stem>Root(ctx)` (e.g. `web-server.composition.ts` → `getWebServerRoot`); infrastructure helpers stay private inside the file.

## ESLint in the monorepo

ESLint is defined at the root level in `eslint.config.js`.

This is the preferred choice for the monorepo: a single central configuration keeps architectural boundaries, common rules, and shared conventions consistent.

Differences between apps, core packages, and infrastructure packages should be expressed through specific `files` blocks in the flat config.

Example:

```js
export default defineConfig(
  // common rules
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // all apps
  {
    files: ["apps/**/*.{ts,tsx}"],
    rules: {
      // rules shared by all apps
    },
  },

  // a specific app
  {
    files: ["apps/web-next/**/*.{ts,tsx}"],
    rules: {
      // web-next-specific rules
    },
  },

  // all core packages
  {
    files: ["packages/core-*/**/*.{ts,tsx}"],
    rules: {
      // stricter rules for core packages
    },
  },

  // a specific core package
  {
    files: ["packages/core-billing/**/*.{ts,tsx}"],
    rules: {
      // billing-specific exceptions or constraints
    },
  },

  // all infrastructure packages
  {
    files: ["packages/infrastructure-*/**/*.{ts,tsx}"],
    rules: {
      // rules for adapters and technical integrations
    },
  },
);
```

Physically separate configurations per app or package should be avoided in the initial phase. They increase the risk of drift between packages and make it harder to keep architectural boundaries uniform.

A separate config only makes sense if a package becomes truly autonomous as an independently lintable project, with its own toolchain and lifecycle.

## Architecture documentation

Full rules: [architecture/clean-architecture-oriented-monorepo.md](./architecture/clean-architecture-oriented-monorepo.md).

### Agent skills

Task-specific guides live in [`.skills/`](./.skills/) (canonical). Symlinks expose the same tree to Cursor (`.cursor/skills`), GitHub Copilot (`.github/skills`), and Claude Code (`.claude/skills`).

**Agents:** `.cursor/skills` and `.claude/skills` are the **same files** as `.skills/` — edit only `.skills/<name>/SKILL.md`. Do not add “see canonical guide” stubs; see [AGENTS.md](./AGENTS.md).

**Plop MCP:** [`.mcp.json`](./.mcp.json) registers `clean-monorepo-plop` for Cursor and Claude (`.cursor/mcp.json` is a symlink). See [tools/mcp-server/README.md](./tools/mcp-server/README.md).

| Skill                                | Scope                                         |
| ------------------------------------ | --------------------------------------------- |
| `clean-architecture-monorepo`        | Router + link to full architecture doc        |
| `clean-monorepo-spec-map`            | Multi-capability / god-spec decomposition     |
| `clean-monorepo-feature-workflow`    | Multi-layer feature implementation            |
| `clean-monorepo-composition-root`    | App composition wiring (generator-only)       |
| `clean-monorepo-core-package-design` | Core package naming and bounded context       |
| `clean-monorepo-boundaries`          | ESLint boundaries                             |
| `clean-monorepo-plop`                | Plop generators                               |
| `clean-monorepo-core-models`         | Domain kits (`shape` / `primitive` / `proof`) |
| `clean-monorepo-core-capabilities`   | `forShape` / `forPrimitive` capabilities      |
| `clean-monorepo-core-services`       | Cross-model domain services                   |
| `clean-monorepo-core-ports`          | Role-oriented ports (no vendors in core)      |

## Architectural Boundaries

Boundaries are enforced through `eslint-plugin-boundaries` and `no-restricted-imports`.

Principles:

- core packages do not import infrastructure or UI packages;
- infrastructure packages do not import UI packages;
- UI packages (`@ui/*`) are consumed from apps only;
- core packages do not import frameworks or external SDKs;
- packages do not import code from `apps/`;
- imports from core packages go only through the fixed public entrypoints (`models`, `operations`, `use-cases`, `ports`, `errors`);
- domain kits live in `models/`; domain errors live in `errors/` (`core-errors` boundary);
- each app's `composition/` folder is the wiring point between use cases, ports, and concrete adapters.
