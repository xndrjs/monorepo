---
name: clean-monorepo-core-models
description: Implements or reviews *.shape.ts, *.primitive.ts, and *.proof.ts domain kits in @core packages of the clean-template monorepo. Use when creating shapes, primitives, proofs with @xndrjs/domain-zod, or running pnpm generate shape|primitive|proof.
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

| Layer         | Responsibility                       |
| ------------- | ------------------------------------ |
| `models/`     | Structure, validation, proofs        |
| `operations/` | Behavior on kits (`XxxCapabilities`) |

Scaffold capabilities after shapes/primitives exist; see skill `clean-monorepo-core-capabilities`.

## Anti-patterns

- Re-introducing `*.model.ts` or `XxxModel.schema` patterns.
- Deep-importing another feature’s kit file.
- Framework or infrastructure imports in `models/`.

## Tests

Colocate `models/<name>.test.ts` when validation, composition, or `refineType` guards are non-trivial. Run `pnpm test:node`.

## Related

- Capabilities: skill `clean-monorepo-core-capabilities`.
- Cross-model rules: skill `clean-monorepo-core-services`.
- Multi-layer order: skill `clean-monorepo-feature-workflow` (Phase 2+; agree Phase 1 sequence diagrams first).
- New core package: skill `clean-monorepo-plop` (`core-feature` generator).
