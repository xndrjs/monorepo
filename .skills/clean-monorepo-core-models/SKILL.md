---
name: clean-monorepo-core-models
description: Implements or reviews *.shape.ts, *.primitive.ts, and *.proof.ts domain kits in @core packages. Proofs add guarantees on already-valid data (refineType); DESIGN.md diagrams use Note over core XxxProof.test(…) then short alt/else labels. Use when creating kits or running pnpm generate shape|primitive|proof.
---

# Core domain kits (`models/`)

## Architecture context

Models layer rules and import bans:

[architecture/clean-architecture-oriented-monorepo.md](../../../architecture/clean-architecture-oriented-monorepo.md) — _Domain kits_, _Core packages_.

## Scaffold

```sh
pnpm generate primitive   # scalar VO, e.g. email + string
pnpm generate shape       # entity kit, e.g. user
pnpm generate proof       # refined type, e.g. verified-user
```

| Generator   | Prompts                                                        | Output file            |
| ----------- | -------------------------------------------------------------- | ---------------------- |
| `primitive` | core package, name, scalar (`string` \| `number` \| `boolean`) | `<kebab>.primitive.ts` |
| `shape`     | core package, name (suffix `shape` stripped)                   | `<kebab>.shape.ts`     |
| `proof`     | core package, name (brand = PascalCase of name)                | `<kebab>.proof.ts`     |

## Shape (`*.shape.ts`)

```ts
import { domain, zodToValidator } from "@xndrjs/domain-zod";
import { z } from "zod";

export const UserShape = domain.shape(
  "User",
  zodToValidator(
    z.object({
      email: z.string(), // TODO: compose EmailPrimitive or inline Zod
    }),
  ),
);
```

## Primitive (`*.primitive.ts`)

```ts
import { domain, zodToValidator } from "@xndrjs/domain-zod";
import { z } from "zod";

export const EmailPrimitive = domain.primitive(
  "Email",
  zodToValidator(z.string()), // or z.number() / z.boolean()
);
```

## Proof (`*.proof.ts`)

### When to use a proof

A proof expresses an **additional domain guarantee** on data that is already structurally valid (via `XxxShape.create` / `XxxPrimitive.create` or equivalent). Typical cases:

- Session/state invariants (`UnlockedVault`, vault unlocked for CRUD).
- Authorization or role semantics on an entity.
- Stronger invariants on a single field **after** creation—e.g. “this email is verified”, not “this string parses as email”.

**Not** a substitute for input construction: required fields, formats, and bounds at the boundary stay on **shapes/primitives** (Zod in `create`).

A proof may apply to a whole shape **or** a narrow refinement; scope is driven by domain language, not file count.

### Proofs in `DESIGN.md` (Phase 1)

When a proof **gates** a flow, document it in `specs/<spec-name>/DESIGN.md`. If using a Mermaid diagram, put the **proof API on a `Note`**, then branch with **short** `alt` / `else` labels (Mermaid wraps long `alt` text poorly), for example:

```txt
Note over core: UnlockedVaultProof.test(vault)
alt vault is unlocked
  ...
else vault is locked
  ...
```

Do **not** put only `alt UnlockedVaultProof.test(vault)` when the label is long enough to wrap awkwardly. Do **not** use a vague `alt` without the preceding note when a proof gates the branch. See skill `clean-monorepo-feature-workflow` (Phase 1).

```ts
import { domain, zodToValidator } from "@xndrjs/domain-zod";
import { z } from "zod";

export const VerifiedUserProof = domain
  .proof(
    "VerifiedUser",
    zodToValidator(
      z.object({
        // TODO: baseline schema
      }),
    ),
  )
  .refineType(
    (
      row,
    ): row is typeof row & {
      /* narrowed fields */
    } => {
      // TODO: semantic guard
      throw new Error("Not implemented");
    },
  );
```

## Rules

- Export kits as `XxxShape`, `XxxPrimitive`, `XxxProof`—re-export via `models/index.ts` barrel.
- Use `@xndrjs/domain-zod` (`domain`, `zodToValidator`) and Zod inline; **do not** add `XxxModel` namespaces or `DeepReadonly` wrappers for new kits.
- Compose by importing other kits from the same feature’s `models/` (barrel or relative)—not deep paths from outside the package.
- `types/shared.types.ts` remains for optional internal helpers only; it is not required for domain kits.

## Kit vs capabilities

| Layer         | Responsibility                                                                     |
| ------------- | ---------------------------------------------------------------------------------- |
| `models/`     | Structure; **create** + structural validation (Zod); **proofs** (extra guarantees) |
| `operations/` | **Custom** methods on kits beyond create/validation (`XxxCapabilities`)            |

Scaffold capabilities after shapes/primitives exist; see skill `clean-monorepo-core-capabilities`.

## Anti-patterns

- Re-introducing `*.model.ts` or `XxxModel.schema` patterns.
- Deep-importing another feature’s kit file.
- Framework or infrastructure imports in `models/`.
- Using a proof only to duplicate what `Shape.create` / `Primitive.create` already enforces at input time.
- Proof-gated branch in `DESIGN.md` diagrams with **only** `alt XxxProof.test(…)` (long label wraps badly)—use **Note + short `alt`** instead.
- Proof-gated branch with a vague **`alt`** and **no** `Note over core: XxxProof.test(…)` before it.

## Tests

Colocate `models/<name>.test.ts` when validation, composition, or `refineType` guards are non-trivial. Run `pnpm test:node`.

## Related

- Capabilities: skill `clean-monorepo-core-capabilities`.
- Cross-model rules: skill `clean-monorepo-core-services`.
- Multi-layer order: skill `clean-monorepo-feature-workflow` (Phase 2+; agree Phase 1 `SPEC.md` and `DESIGN.md` first).
- New core package: skill `clean-monorepo-plop` (`core-feature` generator).
