---
name: clean-monorepo-feature-workflow
description: Step-by-step workflow for implementing a multi-layer feature in the clean-template monorepo—domain kits, capabilities, services, use cases, ports, infrastructure, composition. Use when a task spans @core, @infrastructure, and apps; enforces inside-out order, test gates, and hard stops on architecture violations.
---

# Feature workflow (multi-layer)

## When to use

A user story touches **models**, **operations**, **use cases**, **ports**, **infrastructure**, and/or **composition**.

For a single artifact (only a shape, only ESLint), use the specialized skill instead—see router `clean-architecture-monorepo`.

Canonical architecture:

[architecture/clean-architecture-oriented-monorepo.md](../../../architecture/clean-architecture-oriented-monorepo.md)

---

## Phase 0 — Discovery

- [ ] Which `@core/<feature>` (or `pnpm generate core-feature`)? See skill `clean-monorepo-core-package-design`.
- [ ] List domain concepts → candidate `*.primitive.ts`, `*.shape.ts`, `*.proof.ts` files.
- [ ] List external dependencies → candidate `*.port.ts` (names only; no SDK types).
- [ ] Acceptance criteria in **domain language**, not vendor APIs.

**Stop** if the task mixes unrelated bounded contexts—split into vertical slices first.

---

## Phase 1 — Domain kits (`models/`)

Work in dependency order: **primitive → shape → proof**.

1. Scaffold kits: `pnpm generate primitive`, `pnpm generate shape`, `pnpm generate proof` as needed (skill `clean-monorepo-core-models`).
2. Fill Zod schemas, compose primitives into shapes, implement `refineType` on proofs.
3. Add colocated `models/*.test.ts` when validation or refinement is non-trivial.

**Gate:** `pnpm test:node` (model-layer tests) · `pnpm lint`

---

## Phase 2 — Operations (capabilities + services)

Work **before** use cases and infrastructure.

### Single-kit behavior → `*.capabilities.ts`

- `pnpm generate capabilities` after the shape or primitive kit exists; add `.attach` manually.
- Export `XxxCapabilities`; use `forShape` / `forPrimitive` (skill `clean-monorepo-core-capabilities`).
- Colocated `*.capabilities.test.ts` for non-trivial rules.

### Cross-model pure logic → `*.service.ts`

- Pure exported functions; no default DI (skill `clean-monorepo-core-services`).
- Colocated `*.service.test.ts`.

| Symptom                 | Wrong layer | Right layer               |
| ----------------------- | ----------- | ------------------------- |
| `verify(user)`          | use case    | `user.capabilities.ts`    |
| `total(cart, taxRules)` | use case    | `order-totals.service.ts` |
| `charge(card, gateway)` | service     | use case + `PaymentPort`  |

**Gate:** domain tests green · no `ports/` or infrastructure imports in `models/` or `operations/`.

---

## Phase 3 — Application (ports + use cases)

1. Define **small, role-oriented** `*.port.ts` interfaces driven by use-case needs—domain types only, no framework/SDK types.
2. Implement `*.use-case.ts` orchestration: capabilities, services, then ports.
3. `pnpm generate use-case` scaffolds `*.use-case.test.ts`—replace stub with **fake port** implementations (manual stubs or test doubles).
4. **Never** call real adapters, HTTP, DB, or CMS from core tests.

Use `remeda` `pipe` in use cases when chaining capability steps (skill `clean-monorepo-core-capabilities`).

**Gate:** use-case unit tests green · ports free of infrastructure types · `pnpm lint`

---

## Phase 4 — Infrastructure

After core contracts are stable:

```txt
packages/infrastructure-<name>/
  client/       # SDK setup (reusable)
  mappers/      # raw → domain / port DTOs — unit test here
  adapters/     # implements @core/*/ports
```

- Adapters are thin: map, delegate to client, map back.
- No application orchestration in infrastructure.
- Unit-test mappers (`raw` → domain kits / port shapes) without hitting live APIs when possible.

**Gate:** mapper tests · adapters implement ports without leaking SDK types into `@core/*`

---

## Phase 5 — Composition (and app UI)

Follow skill **`clean-monorepo-composition-root`** (mandatory).

1. **New** composition module → `pnpm generate composition-root` only (never hand-roll the provider skeleton).
2. Wire app-scoped deps on the provider; request-scoped deps via `getForContext(ctx)`.
3. Export `getXxxRoot(ctx)` that passes infrastructure into `createXUseCase({ ...ports })` only—capabilities stay in `operations/`.
4. **No new business rules** in composition—only wiring and framework setup.
5. App/UI calls `getXxxRoot` (or thin wrappers)—not `@infrastructure/*` directly.

**Gate:** `pnpm lint` · `pnpm test:node` (full workspace) · targeted app tests if applicable

---

## Hard stops (non-negotiable)

**Stop and ask / split the task** if you see:

- `@core/*` importing `@infrastructure/*`, `@ui/*`, React, Next, or SDK packages.
- Port interfaces exposing vendor types (`ContentfulEntry`, `Stripe.Charge`, etc.).
- Domain invariants only in adapters or React components.
- Use-case tests requiring real network/DB/CMS.
- Two `@core/*` features importing each other without an explicit integration design.

**Never** relax workspace tooling to bypass a violation (`eslint.config.js`, `tsconfig*.json`, Prettier, Vitest, path aliases, boundary rules). Exception: adding a new framework name to the core ban list—skill `clean-monorepo-boundaries`—only with user awareness.

**Never** add a new `apps/*/composition/*.ts` without `pnpm generate composition-root`.

If tooling or composition structure must change, **stop**, explain necessity to the user, and wait for approval—do not edit config to ship faster.

An architecture-violating “shortcut” is **not** acceptable—re-scope from Phase 0.

---

## Skill map (by phase)

| Phase | Skills                                                             |
| ----- | ------------------------------------------------------------------ |
| 0     | `clean-monorepo-core-package-design`                               |
| 1     | `clean-monorepo-core-models`, `clean-monorepo-plop`                |
| 2     | `clean-monorepo-core-capabilities`, `clean-monorepo-core-services` |
| 3     | `clean-monorepo-plop` (port, use-case)                             |
| 4–5   | `clean-monorepo-boundaries`, `clean-monorepo-composition-root`     |

Router: `clean-architecture-monorepo`.
