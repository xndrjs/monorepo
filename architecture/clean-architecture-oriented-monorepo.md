# Clean Architecture Oriented Monorepo (TypeScript)

> **Audience:** Human developers and coding agents (LLMs).  
> **Purpose:** Canonical architecture for this repository. Agent skills under [`.skills/`](../.skills/) provide task-specific operational guides (also reachable via `.cursor/skills`, `.github/skills`, and `.claude/skills` **symlinks to the same files**); **this file is the source of truth** when they differ—prefer updating both together. Start from skill `clean-architecture-monorepo` when unsure which skill applies.  
> **Agents editing skills:** modify only `.skills/<name>/SKILL.md` — never stub with “see canonical guide” links ([AGENTS.md](../AGENTS.md)).  
> **Scope:** Internal workspace packages under `apps/` and `packages/`. Not designed for publishing packages to npm.

---

## Quick reference (for agents)

| Package kind   | Folder                            | npm name                 | How to import (public)                                                              |
| -------------- | --------------------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| Core feature   | `packages/core-<feature>/`        | `@core/<feature>`        | `@core/<feature>/models` \| `operations` \| `use-cases` \| `ports` \| `errors` only |
| Infrastructure | `packages/infrastructure-<name>/` | `@infrastructure/<name>` | Whatever each package declares in `exports`                                         |
| UI             | `packages/ui-<name>/`             | `@ui/<name>`             | Root export; **only `apps/*` may import**                                           |
| App            | `apps/<app>/`                     | (app package)            | `composition/` exports `get*Root`; routes call wired use cases from there           |

**Core layer import rules (within the same feature package):**

| From layer    | May import                                                  |
| ------------- | ----------------------------------------------------------- |
| `errors/`     | `errors/` only                                              |
| `models/`     | `models/`, `errors/`                                        |
| `operations/` | `models/`, `operations/`, `errors/`                         |
| `ports/`      | `models/`, `ports/`, `errors/`                              |
| `use-cases/`  | `models/`, `operations/`, `ports/`, `use-cases/`, `errors/` |

**Hard bans:**

- Core MUST NOT import `@infrastructure/*`, `@ui/*`, React, Next, other SDKs or `apps/*`.
- Infrastructure MUST NOT import `@ui/*`.
- UI MUST NOT be imported from core or infrastructure (apps only).
- Core imports MUST use the fixed layer entrypoints—no deep paths like `@core/billing/models/user.shape`.
- Do **not** reintroduce `foundation/`, `DeepReadonly`, `createModelKit`, or `*.model.ts` / `XxxModel`.

**Scaffolding:** `pnpm generate <generator>` — see [Plop generators](#plop-generators).

---

## Goals

Split the monorepo into packages to **control dependencies**, **enforce architectural boundaries**, and **separate responsibilities**.

- Packages are **internal** organizational units.
- **Apps** under `apps/` perform final bundling and runtime assembly.
- **Composition roots** wire concrete adapters to ports and expose **pre-wired use cases** via `get*Root(ctx)`; infrastructure factories stay module-private.

---

## Repository layout

```txt
apps/
  web-next/
    composition/          # composition root (required)
    package.json

specs/                    # feature specs — not imported by code
  <spec-name>/
    SPEC.md
    DESIGN.md

packages/
  core-billing/           # @core/billing
    errors/
    models/               # *.shape.ts, *.primitive.ts, *.proof.ts
    operations/
    use-cases/
    ports/
    package.json

  infrastructure-contentful/
    index.ts              # flexible internal layout + exports
    package.json

  ui-react/               # @ui/react — apps only
    index.ts
    package.json
```

---

## Applications (`apps/`)

Deployable or runnable targets: Next.js, React SPA, CLI, workers, API servers.

### Composition root

Every app MUST have a top-level `composition/` folder:

```txt
apps/web-next/composition/
```

**Role:** Assemble **concrete port implementations** (adapters), wire **use-case factories**, and export a **root factory** per runtime module (e.g. `getWebServerRoot(ctx)`). Infrastructure helpers (`getServerInfrastructure`, etc.) are **module-private**.

**Scaffold:** New composition modules MUST be created with `pnpm generate composition-root`. The template separates **app-scoped** deps (module-level `const`) from **request-scoped** deps (inside the private infra factory), then wires use cases in the exported root. Do not hand-roll a new `*.composition.ts` without that generator.

**Generator prompts:**

1. App target
2. **“Will this be a server-only composition root?”** — if yes: `import "server-only"`, `server-only` dependency, default `<app>-server.composition.ts`
3. **“Will this be a client-only composition root?”** — only if not server-only; if yes: `import "client-only"`, `client-only` dependency, default `<app>-client.composition.ts`
4. File name (default `<app>.composition.ts`, or `-server` / `-client` suffix)

**Root export naming** (from file stem, e.g. `web-server.composition.ts` → `getWebServerRoot`):

| Module kind | Private infra helper           | Public root export                |
| ----------- | ------------------------------ | --------------------------------- |
| Server-only | `getServerInfrastructure(ctx)` | `getWebServerRoot(ctx)` (example) |
| Client-only | `getClientInfrastructure(ctx)` | `getWebClientRoot(ctx)` (example) |
| Neutral     | `getInfrastructure(ctx)`       | `getWebRoot(ctx)` (example)       |

Server-only and client-only are **mutually exclusive** in the generator.

**Call sites (routes, handlers, UI):** import the root from composition—not use-case factories or infrastructure:

```ts
import { getWebServerRoot } from "@/composition/web-server.composition";

const { getInvoice } = getWebServerRoot(ctx);
await getInvoice({ invoiceId });
```

**Sizing:** Prefer **one composition file per runtime boundary** for the app—not one file per `@core/<feature>`:

| Runtime | Typical file                    | Public export (example) |
| ------- | ------------------------------- | ----------------------- |
| Server  | `<app>-server.composition.ts`   | `get<App>ServerRoot`    |
| Client  | `<app>-client.composition.ts`   | `get<App>ClientRoot`    |
| Neutral | `<app>.composition.ts` (CLI, …) | `get<App>Root`          |

All features’ use cases for that runtime are wired in the same root. Do **not** split into `billing-server.composition.ts`, etc.

**Domain vs composition:** Attach capability kits to shapes/primitives in `operations/` (`.attach` on the capability kit); composition imports `createXUseCase` from `@core/*/use-cases` and wires them in `get*Root`—capabilities stay in `operations/`.

**Request-scoped dedup (RSC):** On server-only modules, prefer `React.cache` only for shared per-request state (e.g. DataLoader registry), then build adapters inside the private infra helper.

Agent guide: skill `clean-monorepo-composition-root`.

**Rules:**

| Actor                   | Allowed imports                                                                                                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/*/composition/**` | `@core/*`, `@infrastructure/*`, app code, `ui`                                                                                                                                        |
| Rest of app             | `app-composition`, `@core/*/models`, `@core/*/ports`, `@core/*/errors`, `ui`; `import type` from `@core/*/use-cases` allowed—no value imports from use-cases; not `@infrastructure/*` |
| `@core/*`               | MUST NOT import `apps/*`, `@infrastructure/*`, or `@ui/*`                                                                                                                             |
| `@infrastructure/*`     | May implement `@core/*/ports`; MUST NOT orchestrate application use cases                                                                                                             |
| `@ui/*`                 | Consumed from apps only (including `composition/`)                                                                                                                                    |

---

## Core packages (`@core/<feature>`)

Functional core of a feature or bounded context.

**Folder:** `packages/core-<feature>/`  
**Package name:** `@core/<feature>` (e.g. `packages/core-billing` → `@core/billing`)

Each core package is a **vertical slice** (`models`, `operations`, `use-cases`, `ports`, `errors`) for one bounded context—not a technical or horizontal split.

### `specs/` (feature specifications)

**Default:** top-level [`specs/`](../specs/) at the monorepo root holds one folder per vertical slice:

```txt
specs/<spec-name>/
  SPEC.md    # what the feature does — domain language, no vendor terms
  DESIGN.md  # how it maps to @core kits, operations, use cases, ports, and @infrastructure adapters
```

A spec describes an **app story** and may involve **multiple** `@core/*` packages—so specs are **not** tied to a single `packages/core-<feature>/` folder.

For multi-capability products without an agreed decomposition, start with skill `clean-monorepo-spec-map` (`specs/SPEC-MAP.md`), then Phase 1 of skill `clean-monorepo-feature-workflow` per slice.

**Phase 1** of the feature workflow delivers `SPEC.md` and `DESIGN.md` **before** `models/` or other implementation layers. Files are versioned like code; they are **not** imported at runtime and are **not** package exports.

### Package sizing and naming

- Name features after **business language** (e.g. `billing`, `catalog`, `identity`), not `common` or `utils`.
- Prefer **one kit per concept** (`*.shape.ts`, `*.primitive.ts`, or `*.proof.ts`); avoid a single file that accumulates every entity in the slice.
- Put behavior on domain instances in **`*.capabilities.ts`**; cross-model pure logic in **`*.service.ts`**—not scattered across use cases or apps.
- Split into a new `@core/<feature>` when subdomains, ports, or kit groups are largely unrelated; extend the current package when concepts share lifecycle and vocabulary.
- Avoid importing other `@core/*` packages from core code; integrate via ports and composition unless explicitly designed.

Agent guide: skill `clean-monorepo-core-package-design`.

### Layers

| Layer         | Responsibility                                                                | Filename convention                                                             |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `errors/`     | Domain error classes (not required on every public call site)                 | `*.error.ts`, `index.ts`                                                        |
| `models/`     | Domain shapes, primitives, proofs (xndrjs domain kits)                        | `*.shape.ts`, `*.primitive.ts`, `*.proof.ts`, colocated `*.test.ts`, `index.ts` |
| `operations/` | Domain capabilities and cross-model domain services (pure logic)              | `*.capabilities.ts`, `*.service.ts`, colocated `*.test.ts`, `index.ts`          |
| `use-cases/`  | Application orchestration; coordinates domain + ports                         | `*.use-case.ts`, `*.use-case.test.ts`, `index.ts`                               |
| `ports/`      | Role-oriented outbound contracts (domain types only; no vendor names in core) | `*.port.ts`, `index.ts` — skill `clean-monorepo-core-ports`                     |

### Public entrypoints (fixed)

Core packages MUST expose **only** these `package.json` exports:

```txt
@core/<feature>/models
@core/<feature>/operations
@core/<feature>/use-cases
@core/<feature>/ports
@core/<feature>/errors
```

No root export (e.g. `@core/billing`) unless explicitly chosen—and not recommended.

### Import rules

**Allowed:**

```ts
import { UserShape } from "@core/billing/models";
```

**Forbidden:**

```ts
import { UserShape } from "@core/billing/models/user.shape"; // deep import
import { UserShape } from "../../packages/core-billing/models/user.shape"; // relative from outside
import { x } from "@core/billing"; // non-layer entrypoint
```

ESLint enforces deep-import bans on `@core/*` via `no-restricted-imports`. Layers are enforced via `eslint-plugin-boundaries`.

### Domain kits (`models/`)

Domain types are **xndrjs domain kits** scaffolded with Plop (`shape`, `primitive`, `proof`). Use `@xndrjs/domain-zod` (`domain`, `zodToValidator`) and Zod inline in each file—**not** `XxxModel` namespaces, `createModelKit`, or `DeepReadonly`.

| File suffix      | Export              | API (scaffold)                                          |
| ---------------- | ------------------- | ------------------------------------------------------- |
| `*.shape.ts`     | `UserShape`         | `domain.shape("User", zodToValidator(z.object({…})))`   |
| `*.primitive.ts` | `EmailPrimitive`    | `domain.primitive("Email", zodToValidator(z.string()))` |
| `*.proof.ts`     | `VerifiedUserProof` | `domain.proof(…).refineType(…)`                         |

**Rules:**

- One kit per concept; compose shapes by importing other kits from the same feature’s `models/` barrel.
- Proofs refine a baseline schema with `refineType` for **additional guarantees on already-valid data** (state, authorization, semantic invariants)—including on a single field when the guarantee is not the same as input `create` validation.
- Colocated `*.test.ts` in `models/` when validation or refinement is non-trivial.
- Domain errors: `pnpm generate domain-error` → `errors/*.error.ts`.

Agent guide: skill `clean-monorepo-core-models`.

### Capabilities (`*.capabilities.ts`)

Domain **custom** operations on shapes or primitives in `operations/` (beyond kit `create` / structural validation), generated by the `capabilities` generator.

- Export: **`XxxCapabilities`** (e.g. `UserCapabilities`), not a bare name.
- **Do not** implement `validate`, `create`, or equivalent lifecycle methods on capabilities—use `XxxShape.create` / `XxxPrimitive.create` in `models/`.
- **Shape base:** `domain.capabilities.forShape<Contract>().methods(…)`; add `.attach(UserShape)` manually after generate.
- **Primitive base:** `domain.capabilities.forPrimitive<string|number|boolean>().methods(…)`; add `.attach(EmailPrimitive)` manually after generate.

Typical usage after attach:

```ts
const user = UserShape.create(raw);
const renamed = UserCapabilities.rename(user, "Ada");
```

Agent guide: skill `clean-monorepo-core-capabilities`.

### Domain services (`*.service.ts`)

Cross-model domain logic in `operations/`—**pure functions** by default (no mandatory DI factory).

- Use when a rule involves **two or more** domain types from the same `@core/<feature>` (e.g. pricing across line items + tax rules).
- May call capabilities and use domain kit types from `models/`; MUST NOT import `ports/`, `use-cases/`, infrastructure, or UI.
- Prefer **exported functions**; add strategy injection only when a concrete case requires it.
- Colocated tests: `*.service.test.ts` (Vitest `node`).
- **Not** application services: orchestration and I/O belong in `*.use-case.ts` + ports.

Agent guide: skill `clean-monorepo-core-services`.

### Cross-layer dependencies (same package)

```txt
errors      → errors
models      → models, errors
operations  → models, operations, errors
ports       → models, ports, errors
use-cases   → models, operations, ports, use-cases, errors
```

`models/` MUST NOT import `operations/`, `use-cases/`, or `ports/`.

---

## Infrastructure packages (`@infrastructure/<name>`)

Adapters and integrations for specific technologies (CMS, payment, email, etc.).

**Folder:** `packages/infrastructure-<name>/`  
**Example name:** `@infrastructure/contentful`

### Flexible structure

Unlike core, infrastructure **does not** mandate folder layout. Each package defines its own `exports` in `package.json` (single root, subpaths, etc.).

Example layout:

```txt
packages/infrastructure-contentful/
  client.ts
  constants.ts
  adapters/
    page-routing.adapter.ts
  index.ts
```

**Responsibilities (typical):**

- Client/SDK setup and technical config.
- Concrete implementations of `@core/*/ports`.

For loader/repository split responsibilities and shared-raw-shape projection across multiple `@core/*` read models, see [infrastructure-loader-repository-pattern.md](./infrastructure-loader-repository-pattern.md).

**Rules:**

- MAY depend on `@core/*/models`, `@core/*/ports`, and `@core/*/errors` (via entrypoints only).
- MUST NOT contain use cases or application orchestration.
- MUST NOT be imported by `@ui/*` or core packages.

### Packaging strategy: technology/vendor first, bounded-context adapters

Infrastructure packages should be grouped primarily by technology/vendor (for example S3, filesystem, DatoCMS), while still keeping port adapters explicit and bounded by core context.

Recommended split:

- **Technology-shared package** for reusable low-level primitives used by many contexts (for example object clients, key/path normalization, SDK bootstrap).
- **Context adapter packages** for concrete `@core/*/ports` implementations (for example export-flow vs schema-migration adapters), composed using the shared technology package.

Example:

```txt
packages/
  infrastructure-s3/                    # shared technology primitives
    clients/
      filesystem-s3-object.client.ts
      aws-s3-object.client.ts           # optional real cloud impl
    utils/
      s3-key.utils.ts
    index.ts

  infrastructure-s3-export-flow/        # context adapters for @core/export-flow
    adapters/
      s3-export-artifact-storage.adapter.ts
      s3-export-manifest.adapter.ts
    index.ts

  infrastructure-s3-schema-migration/   # context adapters for @core/schema-migration
    adapters/
      s3-schema-source.adapter.ts
      s3-schema-migration-progress.adapter.ts
    index.ts
```

Guardrails:

- Keep shared technology packages free of orchestration and business semantics.
- Extract to shared only after a second concrete reuse appears.
- Prefer small exports with clear ownership; avoid single “mega” vendor package.
- If a technology package grows too fast, split by stable sub-capabilities (for example `*-clients`, `*-persistence`).

See also: [infrastructure packaging strategy](./infrastructure-packaging-strategy.md).

**Note on lint:** ESLint does **not** assume a single root-only import path for infrastructure—consumers must follow each package’s `exports`. Do not add path-depth `no-restricted-imports` rules that conflict with custom subpath exports.

---

## UI packages (`@ui/<name>`)

Shared UI primitives or design-system pieces (React components, tokens, etc.).

**Folder:** `packages/ui-<name>/`  
**Import:** `@ui/<name>` (per package `exports`)

**Rules:**

- **ONLY** `apps/*` (including `apps/*/composition/**`) may import `@ui/*`.
- Core and infrastructure MUST NOT import UI.
- UI packages may import other `ui` packages only.

---

## Module resolution and bundling

Use `moduleResolution: "bundler"` in `tsconfig.base.json`.

**Implications:**

- Workspace packages resolve as TypeScript modules.
- Apps own final bundling, tree-shaking, and deployment.
- Packages are not optimized for independent npm publish.

**Risks:**

- `package.json` `exports`, `tsconfig` paths, and ESLint boundaries must stay aligned.
- Ungoverned deep imports bypass architectural intent—mitigated by `eslint-plugin-boundaries` and `no-restricted-imports` for core.

---

## Architectural boundaries (ESLint)

Primary enforcement: `eslint.config.js` + `eslint-plugin-boundaries` + `eslint-import-resolver-typescript` (`tsconfig.eslint.json`).

**Maintaining workspace tooling:** treat `eslint.config.js`, `tsconfig*.json`, Prettier, and Vitest config as stable infrastructure. Do **not** edit them to silence a single violation or unblock one import—stop and ask the user. The routine exception: when the workspace adds a new **framework or external SDK** dependency, add its npm import name to the core-package `no-restricted-imports` framework/SDK group (alongside `react`, `next`) so `@core/*` cannot import it. See skills `clean-monorepo-boundaries` and router `clean-architecture-monorepo` (_Workspace tooling_).

### Boundary elements

| Element           | Glob                         |
| ----------------- | ---------------------------- |
| `app-composition` | `apps/*/composition`         |
| `app`             | `apps/*`                     |
| `core-errors`     | `packages/core-*/errors`     |
| `core-models`     | `packages/core-*/models`     |
| `core-operations` | `packages/core-*/operations` |
| `core-use-cases`  | `packages/core-*/use-cases`  |
| `core-ports`      | `packages/core-*/ports`      |
| `infrastructure`  | `packages/infrastructure-*`  |
| `ui`              | `packages/ui-*`              |

### Dependency matrix (allowed `from` → `to`)

| From              | May depend on                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `app-composition` | app, app-composition, all core layers (incl. core-errors), infrastructure, ui              |
| `app`             | app, app-composition, core-models, core-ports, core-errors, ui; core-use-cases (type-only) |
| `core-errors`     | core-errors                                                                                |
| `core-models`     | core-models, core-errors                                                                   |
| `core-operations` | core-models, core-operations, core-errors                                                  |
| `core-ports`      | core-models, core-ports, core-errors                                                       |
| `core-use-cases`  | core-models, core-operations, core-ports, core-use-cases, core-errors                      |
| `infrastructure`  | core-models, core-ports, core-errors, infrastructure                                       |
| `ui`              | ui                                                                                         |

Default rule: **disallow** all other cross-element imports.

### Additional restrictions

- **Core files:** `no-restricted-imports` blocks React, Next, `@infrastructure/**`, `@ui/**`.
- **Infrastructure files:** blocks `@ui/**`.
- **App → use-cases:** value imports forbidden; `import type` allowed (`boundaries/dependencies` with `dependency.kind: "type"`).
- **Deep core imports:** `@core/*/*` pattern blocked globally (use layer entrypoints).
- **`boundaries/no-unknown`** and **`no-unknown-files`:** `warn` (progressive adoption).

### Filename enforcement (`eslint-plugin-check-file`)

| Path                          | Allowed files                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `packages/core-*/models/`     | `*.shape.ts`, `*.primitive.ts`, `*.proof.ts`, colocated `*.test.ts`, `index.ts` |
| `packages/core-*/errors/`     | `*.error.ts`, `index.ts`                                                        |
| `packages/core-*/operations/` | `*.capabilities.ts`, `*.service.ts`, colocated `*.test.ts`, `index.ts`          |
| `packages/core-*/use-cases/`  | `*.use-case.ts`, `*.use-case.test.ts`, `index.ts`                               |
| `packages/core-*/ports/`      | `*.port.ts`, `index.ts`                                                         |

---

## Plop generators

Run: `pnpm generate` or `pnpm generate <name>`.

| Generator                   | Creates                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `core-feature`              | New `packages/core-<feature>/` with layers + `errors/`, `@xndrjs/domain`, `@xndrjs/domain-zod`, `zod` (no `foundation/`) |
| `primitive`                 | `models/<name>.primitive.ts` + barrel; base scalar: string \| number \| boolean                                          |
| `shape`                     | `models/<name>.shape.ts` + barrel export                                                                                 |
| `proof`                     | `models/<name>.proof.ts` + barrel; `refineType` stub (brand from proof name)                                             |
| `capabilities`              | `operations/<name>.capabilities.ts` + barrel; base: shape \| primitive (`.attach` manual)                                |
| `domain-error`              | `errors/<name>.error.ts` + barrel; `errorCode` SCREAMING_SNAKE_CASE, `errorMessage` sentence case                        |
| `core-port`                 | `ports/<name>.port.ts` + empty interface                                                                                 |
| `core-use-case`             | `use-cases/<name>.use-case.ts` + **always** `*.use-case.test.ts` (Vitest `node`)                                         |
| `infrastructure-package`    | `packages/infrastructure-<name>/` with root `index.ts`                                                                   |
| `infrastructure-loader`     | `loaders/<name>.loader.ts` + barrel                                                                                      |
| `infrastructure-repository` | `repositories/<name>.repository.ts` + optional port/mapper scaffolding                                                   |
| `ui-package`                | `packages/ui-<name>/`; optional Vitest test (`react` default, `node` optional)                                           |
| `composition-root`          | `apps/<app>/composition/*.composition.ts` — private `get*Infrastructure` + public `get*Root(ctx)` with wired use cases   |

Generator code: `plop/generators/`, templates: `plop/templates/`, entry: `plop/plopfile.cjs`.

**Suggested order for a new feature slice:** `core-feature` → `primitive` → `shape` → `proof` → `capabilities` → `domain-error` / `core-port` / `core-use-case` → infra generators → (manual app shell, then) `composition-root`. Matches skill `clean-monorepo-feature-workflow`.

**Apps:** no app generator—create `apps/<name>/` with `package.json` + `tsconfig.json`, then `pnpm sync-tsconfig-references`, then `composition-root`.

**Root `tsconfig.json` references:** Package scaffolds (`core-feature`, `infrastructure-package`, `ui-package`) run the `syncTsconfigReferences` Plop action after create. `pnpm install` runs `postinstall` → `pnpm sync-tsconfig-references` (`plop/scripts/sync-tsconfig-references.ts`). After adding or removing an app/package folder manually, run `pnpm sync-tsconfig-references` so `pnpm typecheck` (`tsc -b`) stays accurate.

**Dependency versions in new core packages:** `zod` from `plop/common/zod-version.utils.ts`; `@xndrjs/domain` and `@xndrjs/domain-zod` from `plop/common/xndrjs-version.utils.ts` (`{{zodVersion}}`, `{{xndrjsDomainVersion}}`, `{{xndrjsDomainZodVersion}}` in templates).

---

## Target layout (refined example)

```txt
apps/
  web-next/
    composition/
      web-next-server.composition.ts   # all server ports/adapters for this app
      web-next-client.composition.ts   # optional: all client-side wiring
      worker.composition.ts            # optional neutral runtime (CLI, worker, …)
    app/
    package.json

packages/
  core-billing/
    errors/
      missing-id-mapping.error.ts
      index.ts
    models/
      user.shape.ts
      email.primitive.ts
      verified-user.proof.ts
      index.ts
    operations/
      user.capabilities.ts
      order-totals.service.ts
      order-totals.service.test.ts
      index.ts
    ports/
      page-routing.port.ts
      index.ts
    use-cases/
      create-invoice.use-case.ts
      create-invoice.use-case.test.ts
      index.ts
    package.json

  infrastructure-contentful/
    client.ts
    adapters/
      page-routing.adapter.ts
    index.ts
    package.json

  ui-react/
    index.ts
    package.json
```

---

## End-to-end feature workflow

When a change spans domain, application, infrastructure, and composition, work **inside-out**:

0. (Optional) Spec map for multi-capability products — skill `clean-monorepo-spec-map`.
1. Write `specs/<spec-name>/SPEC.md` + `DESIGN.md` (to-be) — no implementation yet.
2. Domain kits in `models/` (primitive → shape → proof) and capabilities/services in `operations/` with colocated tests—per `DESIGN.md`.
3. Ports + use cases with fake port stubs—no real adapters in core tests.
4. Infrastructure loaders/repositories, mappers, and mapper unit tests.
5. App `composition/` wiring only after core contracts are stable.

If a layer cannot be expressed without leaking infrastructure into core, **stop** and split or clarify the task—do not ship an architecture violation.

Agent guide: skill `clean-monorepo-feature-workflow`.

---

## Known risks and mitigations

| Risk                                                             | Mitigation                                                                                |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Folder name ≠ package name (`core-billing` → `@core/billing`)    | `core-feature` Plop generator                                                             |
| Multiple composition files per app                               | Split by **runtime** (server / client / neutral)—not by `@core/<feature>`                 |
| One infrastructure adapter implementing ports from several cores | Allowed but increases coupling—review imports across features                             |
| Framework types leaking into core (especially ports)             | `no-restricted-imports` on core for React/Next                                            |
| Tooling config changed to bypass lint/tsc errors                 | Fix code or get user approval; never loosen rules/paths ad hoc                            |
| Hand-written composition roots without generator scaffold        | Always `pnpm generate composition-root`; skill `clean-monorepo-composition-root`          |
| Exporting `get*Infrastructure` to app call sites                 | Export only `get*Root(ctx)` with wired use cases; infra helpers stay private              |
| One `*.composition.ts` per `@core` feature (fragmentation)       | One file per **runtime**; wire all use cases in one `get*Root`                            |
| God composition or capabilities wired in composition             | Keep server/client in separate files with guards; bind capabilities in `operations/` only |
| Use-case tests hitting real adapters                             | Test core with fake ports; keep integration tests in apps                                 |
| Cross-feature “shared” core package creep                        | Keep slices self-contained; integrate via ports + composition                             |
| Legacy `XxxModel` / `foundation/` patterns reintroduced          | Use xndrjs kits only; ban `createModelKit` / `DeepReadonly`                               |

---

## Design principles (summary)

1. **Core stays pure** — no infrastructure, UI, or framework in `@core/*`.
2. **Infrastructure implements ports** — not application flows.
3. **Composition roots wire concretes** — private `get*Infrastructure`; public `get*Root` with pre-wired use cases.
4. **Fixed core entrypoints** — public layers; domain kits in `models/` for shapes, primitives, and proofs.
5. **Flexible infrastructure/UI exports** — governed by `package.json`, not by path-depth lint alone.
6. **Verify with ESLint** — boundaries + check-file + restricted imports; `pnpm lint` after structural changes.

The hard part is not folder names—it is **preventing accidental cross-layer imports**. Explicit entrypoints, filename conventions, Plop scaffolding, and boundary lint are essential parts of the design.

---

## Related files

| File                                                                                                      | Role                                                       |
| --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| [README.md](../README.md)                                                                                 | Tooling, scripts, generator examples                       |
| [eslint.config.js](../eslint.config.js)                                                                   | Boundary and import rules (implementation)                 |
| [architecture/infrastructure-packaging-strategy.md](./infrastructure-packaging-strategy.md)               | Technology/vendor-first infrastructure packaging           |
| [architecture/specification-driven-feature-workflow.md](./specification-driven-feature-workflow.md)       | Lean SPEC.md / DESIGN.md workflow for multi-layer features |
| [architecture/infrastructure-loader-repository-pattern.md](./infrastructure-loader-repository-pattern.md) | Loader vs repository split                                 |

### Agent skills (task-specific; load via @ or narrow intent)

| Skill                                                                                        | Use for                                              |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [clean-architecture-monorepo](../.skills/clean-architecture-monorepo/SKILL.md)               | Router when context is ambiguous                     |
| [clean-monorepo-spec-map](../.skills/clean-monorepo-spec-map/SKILL.md)                       | Multi-capability / god-spec decomposition            |
| [clean-monorepo-feature-workflow](../.skills/clean-monorepo-feature-workflow/SKILL.md)       | Multi-layer feature implementation order             |
| [clean-monorepo-composition-root](../.skills/clean-monorepo-composition-root/SKILL.md)       | App composition, app- vs request-scoped wiring       |
| [clean-monorepo-core-package-design](../.skills/clean-monorepo-core-package-design/SKILL.md) | Core package naming and sizing                       |
| [clean-monorepo-boundaries](../.skills/clean-monorepo-boundaries/SKILL.md)                   | ESLint boundaries and imports                        |
| [clean-monorepo-plop](../.skills/clean-monorepo-plop/SKILL.md)                               | Plop generators and templates                        |
| [clean-monorepo-core-models](../.skills/clean-monorepo-core-models/SKILL.md)                 | `*.shape.ts`, `*.primitive.ts`, `*.proof.ts`         |
| [clean-monorepo-core-capabilities](../.skills/clean-monorepo-core-capabilities/SKILL.md)     | `*.capabilities.ts` (`forShape` / `forPrimitive`)    |
| [clean-monorepo-core-services](../.skills/clean-monorepo-core-services/SKILL.md)             | `*.service.ts` cross-model domain logic              |
| [clean-monorepo-core-ports](../.skills/clean-monorepo-core-ports/SKILL.md)                   | `*.port.ts` role-oriented ports (no vendors in core) |
