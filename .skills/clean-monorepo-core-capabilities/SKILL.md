---
name: clean-monorepo-core-capabilities
description: Implements or reviews *.capabilities.ts — custom domain methods on one kit beyond create/validation (never validate/create on capabilities; those belong to Shape/Primitive.create). Use when adding forShape/forPrimitive custom behavior or pnpm generate capabilities.
---

# Core capabilities (operations)

## Preferred way to work on domain kits

Capabilities are the **preferred** way to implement **custom domain behavior** on domain kits (`*.shape.ts`, `*.primitive.ts`) — operations that go **beyond** kit `create` and the structural validation bundled with creation.

Whenever logic mutates or derives values on an **already constructed** kit instance, implement it in a matching `*.capabilities.ts` file — not ad hoc in use cases, apps, or infrastructure.

**Not capabilities:** `create`, `validate`, or any method that only mirrors shape/primitive construction or Zod parsing—that stays on **`XxxShape` / `XxxPrimitive`** in `models/`. **Not capabilities:** flow gates that need a proof (`UnlockedVaultProof.test`) or cross-kit rules (`*.service.ts`).

**Why:** each capability kit exposes `XxxCapabilities` with typed `methods` and `.attach` to the domain kit. Add `.attach` manually in `operations/` after generate—not in composition. Use cases import `XxxCapabilities` from `@core/<feature>/operations`.

**Flow:**

1. Define structure in `models/` (`pnpm generate primitive` → `shape` → `proof` as needed).
2. Define how to **operate** on that type in `operations/<name>.capabilities.ts` (`pnpm generate capabilities`).
3. Use cases orchestrate ports and call capabilities—they do not reimplement domain rules inline.

**Cross-model rules** (two or more kits, still pure domain): use `*.service.ts` pure functions—skill `clean-monorepo-core-services`—not a capability file and not a use case.

## Architecture context

Operations layer and dependencies:

[architecture/clean-architecture-oriented-monorepo.md](../../../architecture/clean-architecture-oriented-monorepo.md) — _Capabilities_, _Core packages_.

## Scaffold

```sh
pnpm generate capabilities
```

Prompts: core package, capabilities name (suffix `capabilities` stripped), base type (`shape` \| `primitive`), primitive scalar when primitive. The generator does **not** add `.attach`—wire the kit import and `.attach(XxxShape|Primitive)` by hand.

Export name in this monorepo: **`UserCapabilities`** (suffixed), not bare `User` as in xndrjs interop-demo.

## Shape capabilities (with attach)

```ts
import { domain } from "@xndrjs/domain-zod";
import { UserShape } from "../models/user.shape.js";

export const UserCapabilities = domain.capabilities
  .forShape<{
    displayName: string;
    isVerified: boolean;
  }>()
  .methods(({ patch }) => ({
    rename: (user, displayName: string) => patch(user, { displayName }),
  }))
  .attach(UserShape);
```

## Primitive capabilities

```ts
import { domain } from "@xndrjs/domain-zod";
import { EmailPrimitive } from "../models/email.primitive.js";

export const EmailCapabilities = domain.capabilities
  .forPrimitive<string>()
  .methods(({ create }) => ({
    normalize: (value: string) => create(value.trim().toLowerCase()),
  }))
  .attach(EmailPrimitive);
```

## Usage after attach

```ts
const user = UserShape.create(raw);
const renamed = UserCapabilities.rename(user, "Ada");
```

## Chaining multiple capability steps (`remeda`)

When a flow applies **several capability functions in sequence**, add [`remeda`](https://remeda.pages.dev/) to the **core package** that orchestrates them:

```sh
pnpm add remeda --filter @core/<feature>
```

Prefer **`pipe`** in use cases when sequencing; capability files define the kit and methods, not port orchestration:

```ts
import { pipe } from "remeda";
import { UserShape } from "../models/user.shape.js";
import { UserCapabilities } from "./user.capabilities.js";

const renamed = pipe(raw, UserShape.create, UserCapabilities.rename);
```

### `DESIGN.md` notation (Phase 1)

List real capability methods in `DESIGN.md` (and in optional Mermaid notes), e.g. `UserCapabilities.rename(user, name)`.

**Forbidden in design docs and code:** `XxxCapabilities.validate`, `XxxCapabilities.create`, or other names that duplicate kit lifecycle. Use `XxxShape.create(input)` / `XxxPrimitive.create(value)` instead.

## Rules

- File name: `<kebab>.capabilities.ts` in `operations/`; export `XxxCapabilities`.
- Update `operations/index.ts` barrel (`export * from "./<kebab>.capabilities"`).
- May import domain kits from `../models/` in the same feature—not from `ports/`, `use-cases/`, or infrastructure.
- Use cases import capabilities from `@core/<feature>/operations`—never wire capability `.attach` in `apps/*/composition/`.

## Anti-patterns

- Domain rules on kit values **outside** capabilities (e.g. only in a use case or React component).
- Capability methods named **`validate`**, **`create`**, or equivalent kit-lifecycle aliases — use the shape/primitive kit.
- `createXCapabilities(XxxModel.from)` or composition-time capability binding (legacy pattern).
- Importing `@infrastructure/*` or UI in capabilities.
- Exporting capabilities that orchestrate use cases (belongs in `use-cases/`).

## Related

- Cross-model domain logic: skill `clean-monorepo-core-services`.
- Multi-layer order: skill `clean-monorepo-feature-workflow`.
- Domain kits: skill `clean-monorepo-core-models`.
- Scaffold: skill `clean-monorepo-plop`.
