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
    core-package.generator.ts
    composition-root.generator.ts
    infrastructure-package.generator.ts
    shape.generator.ts
    primitive.generator.ts
    proof.generator.ts
    capabilities.generator.ts
    port.generator.ts
    use-case.generator.ts
  templates/
  plopfile.cjs
```

`plop/plopfile.cjs` is only the Plop entrypoint. Generator implementations should live in dedicated files, preferably TypeScript files.

Run:

```sh
pnpm generate
```

Available generators:

- `core-feature`: creates a `@core/<feature>` package under `packages/core-<feature>` (includes `@xndrjs/domain`, `@xndrjs/domain-zod`, and `zod`).
- `composition-root`: creates a composition root file under an existing app.
- `infrastructure-package`: creates an `@infrastructure/<name>` package.
- `ui-package`: creates a `@ui/<name>` package (importable from apps only).
- `shape`: creates a domain shape kit under an existing core package (`*.shape.ts`).
- `primitive`: creates a domain primitive kit under an existing core package (`*.primitive.ts`).
- `proof`: creates a domain proof kit under an existing core package (`*.proof.ts`).
- `capabilities`: creates domain capabilities under an existing core package (`*.capabilities.ts`).
- `port`: creates a port interface under an existing core package.
- `use-case`: creates a use case under an existing core package.

Root `tsconfig.json` `references` are synced by `pnpm sync-tsconfig-references` (see [TypeScript project references](#typescript-project-references)), not by a Plop generator.

Example:

```sh
pnpm generate core-feature
pnpm generate composition-root
pnpm generate infrastructure-package
pnpm generate ui-package
pnpm generate primitive   # e.g. email, string
pnpm generate shape       # e.g. user
pnpm generate capabilities
pnpm generate proof
pnpm generate port
pnpm generate use-case
```

The generated core package has the fixed layer structure:

```txt
packages/core-billing/
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
    "./ports": "./ports/index.ts"
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

The `ui-package` generator asks for a package name and optionally scaffolds a minimal Vitest test (`react` or `node` project from the root `vitest.config.ts`, default `react`):

```txt
packages/ui-react/
  index.ts
  index.test.tsx
  package.json
  tsconfig.json
```

The generated package is named `@ui/<name>` and exposes a single root entrypoint. ESLint allows `@ui/*` imports only from `apps/*` (including `composition/`).

The `shape` generator asks for an existing core package and a shape name (suffix `shape` is stripped). It scaffolds `{{name}}.shape.ts` with `{{Name}}Shape` via `domain.shape` and `zodToValidator`.

```txt
packages/core-billing/models/user.shape.ts
```

The `primitive` generator asks for an existing core package, a primitive name, and a base scalar (`string`, `number`, or `boolean`). It scaffolds `{{name}}.primitive.ts` with `{{Name}}Primitive` via `domain.primitive`.

```txt
packages/core-billing/models/email.primitive.ts
```

The `proof` generator asks for an existing core package and a proof name. It scaffolds `{{name}}.proof.ts` with `{{Name}}Proof` (brand = PascalCase of the name), inline Zod, and a `refineType` stub.

```txt
packages/core-billing/models/verified-user.proof.ts
```

Each `core-feature` package includes `types/shared.types.ts` for optional internal helpers (not a public export). New domain kits use `@xndrjs/domain-zod`, not `XxxModel` namespaces.

The `capabilities` generator asks for an existing core package, a capabilities name, and a base type (`shape` or `primitive`). Export name: `{{Name}}Capabilities` (e.g. `UserCapabilities`). Attach the domain kit manually with `.attach(XxxShape)` or `.attach(XxxPrimitive)` after generate.

```txt
packages/core-billing/operations/user.capabilities.ts
```

The `port` generator asks for an existing core package and a port name.
The file name is normalized to kebab-case with the `.port.ts` suffix:

```txt
packages/core-pagebuilder/ports/page-routing.port.ts
```

It creates an empty `XxxPort` interface and updates the public `ports/index.ts` barrel.

The `use-case` generator asks for an existing core package and a use case name.
The file name is normalized to kebab-case with the `.use-case.ts` suffix:

```txt
packages/core-pagebuilder/use-cases/create-page.use-case.ts
packages/core-pagebuilder/use-cases/create-page.use-case.test.ts
```

It also updates the public `use-cases/index.ts` barrel and scaffolds a Vitest test for the `node` project (`pnpm test:node`).

The `composition-root` generator asks for an existing app and a composition root file name.
The default file name is `<app-name>.composition.ts`.

It creates the app-level `composition/` folder if it does not exist:

```txt
apps/web-next/
  composition/
    web-next.composition.ts
```

If the target composition root file already exists, generation fails.

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

### Cursor Agent skills

Task-specific guides live in `.cursor/skills/`:

| Skill                                | Scope                                             |
| ------------------------------------ | ------------------------------------------------- |
| `clean-architecture-monorepo`        | Router + link to full architecture doc            |
| `clean-monorepo-feature-workflow`    | Multi-layer feature implementation                |
| `clean-monorepo-composition-root`    | App composition wiring (generator-only)           |
| `clean-monorepo-core-package-design` | Core package naming and bounded context           |
| `clean-monorepo-boundaries`          | ESLint boundaries                                 |
| `clean-monorepo-plop`                | Plop generators                                   |
| `clean-monorepo-core-models`         | Domain shapes, primitives, proofs                 |
| `clean-monorepo-core-capabilities`   | Domain capabilities (`forShape` / `forPrimitive`) |
| `clean-monorepo-core-services`       | Cross-model domain services                       |

## Architectural Boundaries

Boundaries are enforced through `eslint-plugin-boundaries` and `no-restricted-imports`.

Principles:

- core packages do not import infrastructure or UI packages;
- infrastructure packages do not import UI packages;
- UI packages (`@ui/*`) are consumed from apps only;
- core packages do not import frameworks or external SDKs;
- packages do not import code from `apps/`;
- imports from core packages go only through the fixed public entrypoints;
- each app's `composition/` folder is the wiring point between use cases, ports, and concrete adapters.
