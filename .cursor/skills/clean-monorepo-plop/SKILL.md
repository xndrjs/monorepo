---
name: clean-monorepo-plop
description: Creates or modifies Plop generators and Handlebars templates under plop/ in the clean-template monorepo. Use when adding generators, editing .hbs templates, plopfile.cjs, barrel exports after scaffold, or when the user runs pnpm generate for core-feature, shape, primitive, proof, capabilities, port, use-case, infrastructure-package, or ui-package.
---

# Plop scaffolding

## When to use Plop

Prefer generators over copying files by hand for:

- new `@core/<feature>` packages
- `*.shape.ts`, `*.primitive.ts`, `*.proof.ts`, `*.capabilities.ts`, `*.port.ts`, `*.use-case.ts`
- `@infrastructure/<name>`, `@ui/<name>`
- app `composition/` roots

Run: `pnpm generate` or `pnpm generate <generator-name>`.

## Layout

```txt
plop/
  plopfile.cjs              # registers generators (tsx/cjs)
  generators/*.generator.ts
  templates/**                # .hbs templates
  common/                     # casing, barrel, zod/xndrjs version utils
```

## Generators

| Name                     | Output                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `core-feature`           | `packages/core-<feature>/` + layers + `types/shared.types.ts` + `@xndrjs/domain`, `@xndrjs/domain-zod`, `zod`           |
| `shape`                  | `models/<kebab>.shape.ts` + barrel                                                                                      |
| `primitive`              | `models/<kebab>.primitive.ts` + barrel; scalar: string \| number \| boolean                                             |
| `proof`                  | `models/<kebab>.proof.ts` + barrel; `refineType` stub (brand from proof name)                                           |
| `capabilities`           | `operations/<kebab>.capabilities.ts` + barrel; base: shape \| primitive (`.attach` manual)                              |
| `port`                   | `ports/<kebab>.port.ts` + empty interface                                                                               |
| `use-case`               | `use-cases/<kebab>.use-case.ts` + **always** `*.use-case.test.ts` (vitest node)                                         |
| `infrastructure-package` | `packages/infrastructure-<name>/`                                                                                       |
| `ui-package`             | `packages/ui-<name>/`; optional vitest (react default)                                                                  |
| `composition-root`       | `apps/<app>/composition/<app>.composition.ts` — **required** for new composition modules (provider + app/request scope) |

**Suggested order for a new slice:** `core-feature` → `primitive` → `shape` → `capabilities` → `proof` → `port` / `use-case`.

## Root `tsconfig.json` references

`pnpm typecheck` uses `tsc -b` on the root solution. The `references` array must list every TypeScript project.

- **`core-feature`**, **`infrastructure-package`**, **`ui-package`**: run `syncTsconfigReferences` automatically after scaffold.
- **Manual app** (no app generator): add `apps/<name>/tsconfig.json`, then `pnpm sync-tsconfig-references` (also runs on `pnpm install` via `postinstall`).
- **Delete** an app or package: remove the folder, then `pnpm sync-tsconfig-references`.

Implementation: Plop action `syncTsconfigReferences` in `plop/common/tsconfig-references.utils.ts` (used by package scaffolds); standalone sync via `pnpm sync-tsconfig-references` (`plop/scripts/sync-tsconfig-references.ts`, also `postinstall`). No dedicated Plop generator.

## Adding a generator

1. Create `plop/generators/<name>.generator.ts`.
2. Add templates under `plop/templates/<name>/`.
3. Register in `plop/plopfile.cjs`.
4. Document in `README.md` (one line + example command).

## Conventions

- Normalize names with `plop/common/casing.utils.ts` (kebab / Pascal / camel).
- Update barrels via `appendExport` from `plop/common/barrel.utils.ts`.
- Core `package.json` versions: `{{zodVersion}}` from `zod-version.utils.ts`; `{{xndrjsDomainVersion}}` / `{{xndrjsDomainZodVersion}}` from `xndrjs-version.utils.ts`.
- Strip redundant suffixes in prompts (e.g. trailing `shape`, `primitive`, `proof`, `capabilities`, `port`, `use case`).

## Package naming

| Folder                               | npm name                     |
| ------------------------------------ | ---------------------------- |
| `packages/core-billing`              | `@core/billing`              |
| `packages/infrastructure-contentful` | `@infrastructure/contentful` |
| `packages/ui-react`                  | `@ui/react`                  |

## Architecture context

Package kinds and entrypoints:

[architecture/clean-architecture-oriented-monorepo.md](../../../architecture/clean-architecture-oriented-monorepo.md) — _Plop generators_ and package sections.

Domain-specific patterns (shapes, primitives, proofs, capabilities) live in their dedicated skills—not here.

Composition wiring (app- vs request-scoped infrastructure): skill `clean-monorepo-composition-root`.

Do not edit root/package `tsconfig`, ESLint, or Prettier to fix scaffold issues—fix templates or ask the user (router: _Workspace tooling_). Exception: root `references` are maintained by `pnpm sync-tsconfig-references` and package scaffolds that run the `syncTsconfigReferences` Plop action.
