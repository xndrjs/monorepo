---
name: clean-monorepo-core-ports
description: Implements or reviews role-oriented *.port.ts contracts in @core packages—domain types only, no vendor names. Use when adding outbound ports, running pnpm generate core-port, or fixing vendor leakage into core ports.
---

# Core ports (`ports/`)

## What a port is here

`ports/<kebab>.port.ts` defines an **outbound role contract** for one `@core/<feature>` slice.

- Named after the **domain role**, never the vendor or SDK (`CmsPort`, `VaultRepositoryPort` — not `ContentfulPort`, `S3Port`).
- Methods speak **domain types** from `models/` (and domain errors when needed)—not SDK DTOs, framework types, or infra shapes.
- Empty interface scaffold is fine; fill methods from DESIGN.md before use cases depend on them.

Architecture:

[architecture/clean-architecture-oriented-monorepo.md](../../architecture/clean-architecture-oriented-monorepo.md) — _Layers_ (`ports/`), _Hard bans_.

## Scaffold

```sh
pnpm generate core-port
```

Or via MCP: `list_generators` → `get_generator_schema` → `run_generator` with generator `core-port`.

Creates `ports/<kebab>.port.ts` (`export interface XxxPort {}`) and updates `ports/index.ts`.

## Rules

| Do                                                              | Do not                                           |
| --------------------------------------------------------------- | ------------------------------------------------ |
| Role name in PascalCase + `Port` suffix                         | Vendor/product names in the type or file         |
| Import domain kits via relative `models/` or `@core/<f>/models` | Import `@infrastructure/*`, React, Next, or SDKs |
| Keep ports thin: load/save/notify-style contracts               | Put orchestration or business rules in the port  |
| Implement adapters only in `@infrastructure/*`                  | Implement ports inside `use-cases/` or apps      |

**May import:** `models/`, `ports/`, `errors/` (same feature).  
**Must not import:** `operations/`, `use-cases/`, `@infrastructure/*`, `@ui/*`, frameworks/SDKs.

## Example

```ts
import type { InvoiceId } from "../models/invoice-id.primitive.js";
import type { Invoice } from "../models/invoice.shape.js";

export interface InvoiceRepositoryPort {
  findById(id: InvoiceId): Promise<Invoice | null>;
  save(invoice: Invoice): Promise<void>;
}
```

## Wiring

1. Use cases depend on the port interface (inject via factory deps).
2. Infrastructure adapters implement the port.
3. Composition (`apps/*/composition/`) constructs the adapter and passes it into `createXUseCase`.

Tests for use cases use **fakes** of the port—never real adapters.

## Anti-patterns

- `ContentfulPagePort`, `StripePaymentPort` (vendor in the name).
- Port methods that accept/return CMS JSON, Prisma rows, or React types.
- One mega-port for an entire feature when DESIGN splits roles (prefer focused role ports).
- Hand-rolling `*.port.ts` without `pnpm generate core-port` when scaffolding a new file (barrel drift).

## Related

- Use cases: skill `clean-monorepo-feature-workflow` (Phase 4) / `clean-monorepo-plop` (`core-use-case`).
- Composition: skill `clean-monorepo-composition-root`.
- Boundaries: skill `clean-monorepo-boundaries`.
