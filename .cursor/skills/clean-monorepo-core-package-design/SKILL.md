---
name: clean-monorepo-core-package-design
description: Guides naming and scope of @core/* packages and domain kits in the clean-template monorepo. Use when adding a new core feature, splitting an oversized package, choosing packages/core-* names, or deciding how many kits belong in one bounded context—not when implementing shapes, primitives, proofs, or capabilities.
---

# Core package design (bounded context)

## Role of a core package

Each `packages/core-<feature>/` is a **vertical slice**: `models/`, `operations/`, `use-cases/`, and `ports/` for one bounded context.

**Package name = business capability**, not a technical concern (`core-zod`, `core-utils`).

| Artifact     | Convention                                            |
| ------------ | ----------------------------------------------------- |
| Folder       | `packages/core-<kebab-feature>/`                      |
| npm name     | `@core/<kebab-feature>`                               |
| Shape        | `<concept>.shape.ts`                                  |
| Primitive    | `<concept>.primitive.ts` (scalar VOs)                 |
| Proof        | `<concept>.proof.ts` (refined types)                  |
| Capabilities | `<concept>.capabilities.ts` (align with kit when 1:1) |
| Port         | role-oriented: `payment-gateway.port.ts`              |

Avoid feature names like `common`, `shared`, `misc`, `helpers`, `utils`.

Full structural rules:

[architecture/clean-architecture-oriented-monorepo.md](../../../architecture/clean-architecture-oriented-monorepo.md) — _Core packages_.

## New package vs extend existing

### Stay in the current `@core/<feature>`

- Domain concepts share vocabulary, invariants, and lifecycle.
- Capabilities naturally compose on the same contracts.
- Use cases orchestrate several models in one story (e.g. `User` + `Subscription` in billing).

### Create a new `core-<feature>` (`pnpm generate core-feature`)

- The area has a distinct ubiquitous language or release cadence.
- Subdomains are independent (e.g. `billing` vs `catalog` vs `identity`).
- You only need a small surface but would pull in many unrelated models and ports.
- `models/` or `ports/` grow large and files cluster into **unrelated** groups with few cross-references.

Empirical hint: many models never reference each other’s value objects and teams discuss them separately → consider a split.

## Avoid god packages (within one core)

Even inside a single vertical slice:

| Do                                                       | Avoid                                             |
| -------------------------------------------------------- | ------------------------------------------------- |
| One kit file per concept (`*.shape.ts`, etc.)            | A single file dumping every entity in the slice   |
| Scalar VOs as `email.primitive.ts`, `money.primitive.ts` | Duplicating string rules inline on many shapes    |
| Behavior via `*.capabilities.ts` (`XxxCapabilities`)     | Mutating domain values only in use cases or apps  |
| Cross-model pure rules via `*.service.ts`                | Same rules duplicated in use cases or adapters    |
| Compose shapes by importing other kits from `models/`    | Re-declaring the same Zod shape in multiple files |

After scaffolding models, add matching capabilities when there is behavior—not only raw types. Use `*.service.ts` when logic spans multiple models.

Related skills: `clean-monorepo-core-models`, `clean-monorepo-core-capabilities`, `clean-monorepo-core-services`, `clean-monorepo-feature-workflow`.

## Cross-feature imports

ESLint allows `core-models` → `core-models` **across** different `@core/*` packages. The template does **not** enforce feature isolation at lint time.

**Policy:**

- Do **not** import `@core/other-feature/*` from a core package unless you have an explicit integration design.
- Prefer keeping each vertical slice self-contained; use **ports** + infrastructure/composition for integration.
- If two features share many types, reconsider boundaries (merge or extract a clearer split)—do not grow a passive “shared core”.

## Checklist before `pnpm generate core-feature`

- [ ] At least one **agreed** flow diagram is saved under top-level [`specs/`](../../../specs/) (skill `clean-monorepo-feature-workflow`, Phase 1)—no implementation code before that. Use `packages/core-<feature>/specs/` only if the user explicitly requested package-local specs.
- [ ] Feature name reflects **business** language (kebab-case).
- [ ] You can list the main domain concepts (candidate `*.shape.ts` / `*.primitive.ts` / `*.proof.ts` files).
- [ ] You know which outward dependencies are ports (candidate `*.port.ts`)—labels should match the diagram’s `core` → `infra` arrows.
- [ ] The slice is not “half the application” in one package.
- [ ] No framework, UI, or infrastructure imports inside core.

Then scaffold:

```sh
pnpm generate core-feature
pnpm generate primitive
pnpm generate shape
pnpm generate capabilities
pnpm generate proof
pnpm generate port
pnpm generate use-case
```

## When to split an existing package

Signs it is time to extract a new `@core/<feature>`:

- Unrelated port groups (CMS vs payments in the same package without overlap).
- Models folder is hard to navigate and kits share no composition (shapes rarely import each other’s primitives).
- Different contributors constantly conflict on the same `index.ts` barrels.
- Documentation of the bounded context takes more than one paragraph of unrelated stories.

**Process:** define the new feature name → `core-feature` → move models/ports/use-cases → update composition imports → `pnpm lint`.

## Related

- Scaffold: `clean-monorepo-plop`
- Router: `clean-architecture-monorepo`
