# Clean Architecture Oriented Monorepo (TypeScript)

> **Audience:** Human developers and coding agents (LLMs).  
> **Purpose:** Canonical architecture for this repository. Cursor skills under `.skills/` provide task-specific operational guides; **this file is the source of truth** when they differ—prefer updating both together. Start from skill `clean-architecture-monorepo` when unsure which skill applies.  
> **Scope:** Internal workspace packages under `apps/` and `packages/`. Not designed for publishing packages to npm.

---

## Quick reference (for agents)

| Package kind   | Folder                            | npm name                 | How to import (public)                                                  |
| -------------- | --------------------------------- | ------------------------ | ----------------------------------------------------------------------- |
| Core feature   | `packages/core-<feature>/`        | `@core/<feature>`        | `@core/<feature>/models` \| `operations` \| `use-cases` \| `ports` only |
| Infrastructure | `packages/infrastructure-<name>/` | `@infrastructure/<name>` | Whatever each package declares in `exports`                             |
| UI             | `packages/ui-<name>/`             | `@ui/<name>`             | Root export; **only `apps/*` may import**                               |
| App            | `apps/<app>/`                     | (app package)            | `composition/` wires everything                                         |

**Core layer import rules (within the same feature package):**

| From layer    | May import                                                 |
| ------------- | ---------------------------------------------------------- |
| `types/`      | `types/` only                                              |
| `models/`     | `models/`, `types/`                                        |
| `operations/` | `models/`, `operations/`, `types/`                         |
| `ports/`      | `models/`, `ports/`, `types/`                              |
| `use-cases/`  | `models/`, `operations/`, `ports/`, `use-cases/`, `types/` |

**Hard bans:**

- Core MUST NOT import `@infrastructure/*`, `@ui/*`, React, Next, other SDKs or `apps/*`.
- Infrastructure MUST NOT import `@ui/*`.
- UI MUST NOT be imported from core or infrastructure (apps only).
- Core imports MUST use the four layer entrypoints—no deep paths like `@core/billing/models/user.shape`.

**Scaffolding:** `pnpm generate <generator>` — see [Plop generators](#plop-generators).

---

## Goals

Split the monorepo into packages to **control dependencies**, **enforce architectural boundaries**, and **separate responsibilities**.

- Packages are **internal** organizational units.
- **Apps** under `apps/` perform final bundling and runtime assembly.
- **Composition roots** are the only place concrete implementations meet ports and use cases.

---

## Repository layout

```txt
apps/
  web-next/
    composition/          # composition root (required)
    package.json

specs/                    # feature specs — not imported by code
  password-vault-unlock/
    SPEC.md               # domain-language functional requirement
    DESIGN.md             # architecture mapping (models, use cases, ports, adapters)

packages/
  core-billing/           # @core/billing
    types/
      shared.types.ts     # internal shared types (e.g. DeepReadonly)
    models/
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

**Role:** Wire use cases, infrastructure adapters, runtime config, and framework-specific setup. This is where **concrete dependencies** are assembled.

**Scaffold:** New composition modules MUST be created with `pnpm generate composition-root` so the generated `InfrastructureProvider` separates **app-scoped** dependencies (provider fields/getters) from **request-scoped** dependencies (created in `getForContext(ctx)`). Do not hand-roll a new `*.composition.ts` without that template.

**Sizing:** Prefer **one composition file per `@core/<feature>`** (e.g. `billing.composition.ts`) rather than a single god root that wires every adapter and use case. Multiple modules under `composition/` are expected.

**Domain vs composition:** Attach capability kits to shapes/primitives in `operations/` (`.attach` on the capability kit); composition only binds ports to use-case factories.

Agent guide: skill `clean-monorepo-composition-root`.

**Rules:**

| Actor                   | Allowed imports                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `apps/*/composition/**` | `@core/*`, `@infrastructure/*`, app code, `ui`                                                 |
| Rest of app             | Composed surfaces, composition exports, or allowed use-case entrypoints—not raw infrastructure |
| `@core/*`               | MUST NOT import `apps/*`, `@infrastructure/*`, or `@ui/*`                                      |
| `@infrastructure/*`     | May implement `@core/*/ports`; MUST NOT orchestrate application use cases                      |
| `@ui/*`                 | Consumed from apps only (including `composition/`)                                             |

---

## Core packages (`@core/<feature>`)

Functional core of a feature or bounded context.

**Folder:** `packages/core-<feature>/`  
**Package name:** `@core/<feature>` (e.g. `packages/core-billing` → `@core/billing`)

Each core package is a **vertical slice** (`models`, `operations`, `use-cases`, `ports`) for one bounded context—not a technical or horizontal split.

### `specs/` (feature specifications)

**Default:** top-level [`specs/`](../specs/) at the monorepo root holds one folder per vertical slice:

```txt
specs/<spec-name>/
  SPEC.md    # what the feature does — domain language, no vendor terms
  DESIGN.md  # how it maps to @core models, operations, use cases, ports, and @infrastructure adapters
```

A spec describes an **app story** and may involve **multiple** `@core/*` packages—so specs are **not** tied to a single `packages/core-<feature>/` folder.

**Phase 1** of the feature workflow delivers these artifacts **before** `models/` or other implementation layers. `DESIGN.md` may optionally include Mermaid `sequenceDiagram` blocks for non-obvious orchestration; proof gates use **`Note over core: XxxProof.test(…)`** then **short** `alt` / `else` labels (not long proof expressions only in `alt`—Mermaid wraps them poorly); never `XxxCapabilities.validate` or `XxxCapabilities.create` in diagrams. Files are versioned like code; they are **not** imported at runtime and are **not** package exports. Agent guide: skill `clean-monorepo-feature-workflow`.

### Package sizing and naming

- Name features after **business language** (e.g. `billing`, `catalog`, `identity`), not `common` or `utils`.
- Prefer **one kit per concept** (`*.shape.ts`, `*.primitive.ts`, or `*.proof.ts`); avoid a single file that accumulates every entity in the slice.
- Put behavior on domain instances in **`*.capabilities.ts`**; cross-model pure logic in **`*.service.ts`**—not scattered across use cases or apps.
- Split into a new `@core/<feature>` when subdomains, ports, or model groups are largely unrelated; extend the current package when concepts share lifecycle and vocabulary.
- Avoid importing other `@core/*` packages from core code; integrate via ports and composition unless explicitly designed.

Agent guide: skill `clean-monorepo-core-package-design`.

### Layers

| Layer         | Responsibility                                                   | Filename convention                                                             |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `types/`      | Internal shared types for this feature only (not public exports) | `*.types.ts`, `index.ts`                                                        |
| `models/`     | Domain shapes, primitives, proofs (xndrjs domain kits)           | `*.shape.ts`, `*.primitive.ts`, `*.proof.ts`, colocated `*.test.ts`, `index.ts` |
| `operations/` | Domain capabilities and cross-model domain services (pure logic) | `*.capabilities.ts`, `*.service.ts`, colocated `*.test.ts`, `index.ts`          |
| `use-cases/`  | Application orchestration; coordinates domain + ports            | `*.use-case.ts`, `*.use-case.test.ts`, `index.ts`                               |
| `ports/`      | Interfaces the core needs from the outside world                 | `*.port.ts`, `index.ts`                                                         |

### Public entrypoints (fixed)

Core packages MUST expose **only** these `package.json` exports:

```txt
@core/<feature>/models
@core/<feature>/operations
@core/<feature>/use-cases
@core/<feature>/ports
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

### Internal types (`types/shared.types.ts`)

Each core feature includes `types/shared.types.ts` (e.g. `DeepReadonly`).

- **MUST** stay internal: relative imports from layers (`../types/shared.types`).
- **MUST NOT** become a shared `@core/foundation` or cross-feature “utils” package unless explicitly designed—avoids a growing shared mudball.

### Domain kits (`models/`)

Domain types are **xndrjs domain kits** scaffolded with Plop (`shape`, `primitive`, `proof`). Use `@xndrjs/domain-zod` (`domain`, `zodToValidator`) and Zod inline in each file—**not** `XxxModel` namespaces or `DeepReadonly` wrappers.

| File suffix      | Export              | API (scaffold)                                          |
| ---------------- | ------------------- | ------------------------------------------------------- |
| `*.shape.ts`     | `UserShape`         | `domain.shape("User", zodToValidator(z.object({…})))`   |
| `*.primitive.ts` | `EmailPrimitive`    | `domain.primitive("Email", zodToValidator(z.string()))` |
| `*.proof.ts`     | `VerifiedUserProof` | `domain.proof(…).refineType(…)`                         |

**Rules:**

- One kit per concept; compose shapes by importing other kits from the same feature’s `models/` barrel.
- Proofs refine a baseline schema with `refineType` for **additional guarantees on already-valid data** (state, authorization, semantic invariants)—including on a single field when the guarantee is not the same as input `create` validation.
- Colocated `*.test.ts` in `models/` when validation or refinement is non-trivial.

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
models      → models, types
operations  → models, operations, types
ports       → models, ports, types
use-cases   → models, operations, ports, use-cases, types
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

**Rules:**

- MAY depend on `@core/*/models` and `@core/*/ports` (via entrypoints only).
- MUST NOT contain use cases or application orchestration.
- MUST NOT be imported by `@ui/*` or core packages.

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
| `core-types`      | `packages/core-*/types`      |
| `core-models`     | `packages/core-*/models`     |
| `core-operations` | `packages/core-*/operations` |
| `core-use-cases`  | `packages/core-*/use-cases`  |
| `core-ports`      | `packages/core-*/ports`      |
| `infrastructure`  | `packages/infrastructure-*`  |
| `ui`              | `packages/ui-*`              |

### Dependency matrix (allowed `from` → `to`)

| From              | May depend on                                                        |
| ----------------- | -------------------------------------------------------------------- |
| `app-composition` | app, app-composition, all core layers, infrastructure, ui            |
| `app`             | app, app-composition, core-models, core-ports, ui                    |
| `core-types`      | core-types                                                           |
| `core-models`     | core-models, core-types                                              |
| `core-operations` | core-models, core-operations, core-types                             |
| `core-ports`      | core-models, core-ports, core-types                                  |
| `core-use-cases`  | core-models, core-operations, core-ports, core-use-cases, core-types |
| `infrastructure`  | core-models, core-ports, infrastructure                              |
| `ui`              | ui                                                                   |

Default rule: **disallow** all other cross-element imports.

### Additional restrictions

- **Core files:** `no-restricted-imports` blocks React, Next, `@infrastructure/**`, `@ui/**`.
- **Infrastructure files:** blocks `@ui/**`.
- **Deep core imports:** `@core/*/*` pattern blocked globally (use layer entrypoints).
- **`boundaries/no-unknown`** and **`no-unknown-files`:** `warn` (progressive adoption).

### Filename enforcement (`eslint-plugin-check-file`)

| Path                          | Allowed files                                                                   |
| ----------------------------- | ------------------------------------------------------------------------------- |
| `packages/core-*/models/`     | `*.shape.ts`, `*.primitive.ts`, `*.proof.ts`, colocated `*.test.ts`, `index.ts` |
| `packages/core-*/operations/` | `*.capabilities.ts`, `*.service.ts`, colocated `*.test.ts`, `index.ts`          |
| `packages/core-*/use-cases/`  | `*.use-case.ts`, `*.use-case.test.ts`, `index.ts`                               |
| `packages/core-*/ports/`      | `*.port.ts`, `index.ts`                                                         |
| `packages/core-*/types/`      | `*.types.ts`, `index.ts`                                                        |

---

## Plop generators

Run: `pnpm generate` or `pnpm generate <name>`.

| Generator                | Creates                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `core-feature`           | New `packages/core-<feature>/` with layers, `@xndrjs/domain`, `@xndrjs/domain-zod`, `zod` |
| `shape`                  | `models/<name>.shape.ts` + barrel export                                                  |
| `primitive`              | `models/<name>.primitive.ts` + barrel; base scalar: string \| number \| boolean           |
| `proof`                  | `models/<name>.proof.ts` + barrel; `refineType` stub (brand from proof name)              |
| `capabilities`           | `operations/<name>.capabilities.ts` + barrel; base: shape \| primitive (`.attach` manual) |
| `port`                   | `ports/<name>.port.ts` + empty interface                                                  |
| `use-case`               | `use-cases/<name>.use-case.ts` + **always** `*.use-case.test.ts` (Vitest `node`)          |
| `infrastructure-package` | `packages/infrastructure-<name>/` with root `index.ts`                                    |
| `ui-package`             | `packages/ui-<name>/`; optional Vitest test (`react` default, `node` optional)            |
| `composition-root`       | `apps/<app>/composition/<app>.composition.ts`                                             |

Generator code: `plop/generators/`, templates: `plop/templates/`, entry: `plop/plopfile.cjs`.

**Suggested order for a new feature slice:** `core-feature` → `primitive` → `shape` → `capabilities` → `proof` → `port` / `use-case`.

**Root `tsconfig.json` references:** Package scaffolds (`core-feature`, `infrastructure-package`, `ui-package`) run the `syncTsconfigReferences` Plop action after create. `pnpm install` runs `postinstall` → `pnpm sync-tsconfig-references` (`plop/scripts/sync-tsconfig-references.ts`). After adding or removing an app/package folder manually, run `pnpm sync-tsconfig-references` so `pnpm typecheck` (`tsc -b`) stays accurate.

**Dependency versions in new core packages:** `zod` from `plop/common/zod-version.utils.ts`; `@xndrjs/domain` and `@xndrjs/domain-zod` from `plop/common/xndrjs-version.utils.ts` (`{{zodVersion}}`, `{{xndrjsDomainVersion}}`, `{{xndrjsDomainZodVersion}}` in templates).

---

## Target layout (refined example)

```txt
apps/
  web-next/
    composition/
      billing.composition.ts
      contentful.composition.ts
    app/
    package.json

packages/
  core-billing/
    types/
      shared.types.ts
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

When a change spans domain, application, infrastructure, and composition:

**Agent checkpoint rule:** Phases run **serially** (specs → models → operations → use cases → infrastructure → composition). **One phase per agent run**; after each phase, the agent **stops** and waits for **explicit user confirmation** before the next. Completing every phase in a single run or single prompt is **not allowed**. Details: skill `clean-monorepo-feature-workflow` (_One phase per run_).

1. **Write specs first** under `specs/<spec-name>/`: **`SPEC.md`** (domain-language functional requirement, no vendor terms) and **`DESIGN.md`** (architecture mapping—models, capabilities, services, use cases, ports, adapters). Optional Mermaid flows in `DESIGN.md` when orchestration is non-obvious. Both files use **to-be** language, not delta checklists. **No implementation code** until specs are clear, agreed, and saved.
2. Domain kits in `models/` (primitive → shape → proof) and capabilities/services in `operations/` with colocated tests—per `DESIGN.md`.
3. Ports + use cases with fake port stubs—no real adapters in core tests (names aligned with `DESIGN.md`).
4. Infrastructure adapters, mappers, and mapper unit tests.
5. App `composition/` wiring only after core contracts are stable.

If a layer cannot be expressed without leaking infrastructure into core, **stop** and split or clarify the task—do not ship an architecture violation.

Agent guide: skill `clean-monorepo-feature-workflow`.

---

## Known risks and mitigations

| Risk                                                             | Mitigation                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Folder name ≠ package name (`core-billing` → `@core/billing`)    | `core-feature` Plop generator                                                              |
| Multiple composition submodules in large apps                    | Allowed under `composition/`; still the only wiring point for concrete adapters            |
| One infrastructure adapter implementing ports from several cores | Allowed but increases coupling—review imports across features                              |
| Framework types leaking into core (especially ports)             | `no-restricted-imports` on core for React/Next                                             |
| Tooling config changed to bypass lint/tsc errors                 | Fix code or get user approval; never loosen rules/paths ad hoc                             |
| Hand-written composition roots without provider pattern          | Always `pnpm generate composition-root`; skill `clean-monorepo-composition-root`           |
| God composition root or capabilities wired in composition        | One `*.composition.ts` per feature; bind capabilities in `operations/` only                |
| Use-case tests hitting real adapters                             | Test core with fake ports; keep integration tests in apps                                  |
| Cross-feature “shared” core package creep                        | Prefer `types/shared.types.ts` **per feature**; avoid `@core/foundation`-style shared libs |

---

## Design principles (summary)

1. **Core stays pure** — no infrastructure, UI, or framework in `@core/*`.
2. **Infrastructure implements ports** — not application flows.
3. **Composition roots wire concretes** — one place per app for credentials, clients, and bindings.
4. **Fixed core entrypoints** — four public layers; domain kits in `models/` for shapes, primitives, and proofs.
5. **Flexible infrastructure/UI exports** — governed by `package.json`, not by path-depth lint alone.
6. **Verify with ESLint** — boundaries + check-file + restricted imports; `pnpm lint` after structural changes.

The hard part is not folder names—it is **preventing accidental cross-layer imports**. Explicit entrypoints, filename conventions, Plop scaffolding, and boundary lint are essential parts of the design.

---

## Related files

| File                                    | Role                                       |
| --------------------------------------- | ------------------------------------------ |
| [README.md](../README.md)               | Tooling, scripts, generator examples       |
| [eslint.config.js](../eslint.config.js) | Boundary and import rules (implementation) |

### Cursor skills (task-specific; load via @ or narrow intent)

| Skill                                                                                        | Use for                                              |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [clean-architecture-monorepo](../.skills/clean-architecture-monorepo/SKILL.md)               | Router when context is ambiguous                     |
| [clean-monorepo-feature-workflow](../.skills/clean-monorepo-feature-workflow/SKILL.md)       | Flow diagrams first, then multi-layer implementation |
| [clean-monorepo-composition-root](../.skills/clean-monorepo-composition-root/SKILL.md)       | App composition, app- vs request-scoped wiring       |
| [clean-monorepo-core-package-design](../.skills/clean-monorepo-core-package-design/SKILL.md) | Core package naming and sizing                       |
| [clean-monorepo-boundaries](../.skills/clean-monorepo-boundaries/SKILL.md)                   | ESLint boundaries and imports                        |
| [clean-monorepo-plop](../.skills/clean-monorepo-plop/SKILL.md)                               | Plop generators and templates                        |
| [clean-monorepo-core-models](../.skills/clean-monorepo-core-models/SKILL.md)                 | `*.shape.ts`, `*.primitive.ts`, `*.proof.ts`         |
| [clean-monorepo-core-capabilities](../.skills/clean-monorepo-core-capabilities/SKILL.md)     | `*.capabilities.ts` (`forShape` / `forPrimitive`)    |
| [clean-monorepo-core-services](../.skills/clean-monorepo-core-services/SKILL.md)             | `*.service.ts` cross-model domain logic              |
