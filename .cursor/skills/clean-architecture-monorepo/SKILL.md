---
name: clean-architecture-monorepo
description: Routes ambiguous work in the clean-template TypeScript monorepo to the right specialized skill. Use only when the user asks where to start, which package type to use, or for a high-level architecture overview—not when the task is already specific (models, ESLint, Plop, capabilities).
---

# Clean architecture monorepo (router)

## Full context

For the complete contract (layers, imports, boundaries matrix, risks), read:

[architecture/clean-architecture-oriented-monorepo.md](../../../architecture/clean-architecture-oriented-monorepo.md)

Do not duplicate that document in chat—summarize and link when needed.

## Which specialized skill to follow

| User intent / task                                                   | Skill directory                      |
| -------------------------------------------------------------------- | ------------------------------------ |
| Multi-layer feature (domain → use case → infra → composition)        | `clean-monorepo-feature-workflow`    |
| New/split `@core/*` package, naming, model granularity, god package  | `clean-monorepo-core-package-design` |
| Boundary / forbidden-import violation; ban new framework/SDK in core | `clean-monorepo-boundaries`          |
| Plop generator, template `.hbs`, `plopfile.cjs`, `pnpm generate`     | `clean-monorepo-plop`                |
| `*.shape.ts`, `*.primitive.ts`, `*.proof.ts`, `@xndrjs/domain-zod`   | `clean-monorepo-core-models`         |
| `*.capabilities.ts`, `forShape` / `forPrimitive`, `.attach`          | `clean-monorepo-core-capabilities`   |
| `*.service.ts`, cross-model pure domain functions                    | `clean-monorepo-core-services`       |
| `apps/*/composition/`, wiring, app- vs request-scoped infra          | `clean-monorepo-composition-root`    |

**Read and apply** the matching `SKILL.md` under `.cursor/skills/<name>/` before implementing.

## Global invariants (always)

- Core (`@core/*`) MUST NOT import infrastructure, UI, React, or Next.
- Core public imports: `@core/<feature>/{models,operations,use-cases,ports}` only—no deep paths.
- UI (`@ui/*`) is for apps only; infrastructure must not import UI.
- Prefer `pnpm generate <generator>` over hand-written package scaffolding.
- New composition modules: **`pnpm generate composition-root` only** (skill `clean-monorepo-composition-root`).
- After boundary or generator changes: `pnpm lint`.

## Workspace tooling (do not edit by default)

**Strongly discouraged** without explicit user approval:

- Root or package `tsconfig.json` / `tsconfig.*.json`
- `eslint.config.js`, Prettier config, Vitest config, `package.json` workspace scripts
- Path aliases or boundary rules changed to silence a single error

**If a change seems necessary:** stop implementation, explain **why** to the user, and wait for approval.

**Never** loosen or bypass tooling config to ship faster (e.g. `skipLibCheck`, disabling a rule, widening `include`/`paths` for one import). Fix the code or agree on an architecture change first.

Routine exception (documented in skill `clean-monorepo-boundaries`): add a new framework/SDK name to the core `no-restricted-imports` ban list when the workspace adopts that dependency.

## Human docs

- [README.md](../../README.md) — scripts and generator list
