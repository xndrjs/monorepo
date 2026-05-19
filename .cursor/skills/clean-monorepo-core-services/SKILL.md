---
name: clean-monorepo-core-services
description: Implements or reviews *.service.ts domain services in @core operations layers—pure cross-model domain logic without ports or I/O. Use when rules span multiple models in one feature, or when capabilities alone are not enough—not for use-case orchestration or infrastructure.
---

# Core domain services (operations)

## What a domain service is here

`operations/<name>.service.ts` holds **cross-model domain logic** for one `@core/<feature>` slice.

- **Pure exported functions** by default—no mandatory `createXService` factory or DI.
- Add strategy injection only when a specific case needs it; do not scaffold DI upfront.
- **Not** application services: orchestration, ports, and external I/O belong in `*.use-case.ts`.

Architecture:

[architecture/clean-architecture-oriented-monorepo.md](../../../architecture/clean-architecture-oriented-monorepo.md) — _Domain services_.

## Capabilities vs services

| Use                                                      | File                                    |
| -------------------------------------------------------- | --------------------------------------- |
| Behavior on **one** domain kit                           | `*.capabilities.ts` + `XxxCapabilities` |
| Logic across **two or more** domain types (same feature) | `*.service.ts` pure functions           |
| Fetch, persist, notify, call APIs                        | `use-case` + `port` + infrastructure    |

## Example

```ts
import type { LineItem } from "../models/line-item.shape.js";
import type { TaxRule } from "../models/tax-rule.shape.js";
import { MoneyPrimitive } from "../models/money.primitive.js";

export function calculateLineTotal(item: LineItem, rule: TaxRule) {
  const subtotal = item.quantity * item.unitPrice;
  const tax = subtotal * rule.rate;
  return MoneyModel.from({ amount: subtotal + tax, currency: item.currency });
}
```

Callers (use cases) pass **already validated** domain values (`XxxShape.create` / capabilities upstream).

## Tests

Colocate `operations/<name>.service.test.ts` next to the service.

```sh
pnpm test:node
```

Cover happy paths, edge cases, and invalid combinations of domain inputs (without mocking ports).

## Rules

- File name: `<kebab>.service.ts` in `operations/`.
- Export from `operations/index.ts` (`export * from "./<kebab>.service"`).
- May import `models/`, other `operations/` (capabilities, services), `types/`—not `ports/`, `use-cases/`, `@infrastructure/*`, or UI.
- Keep functions deterministic; no side effects, clocks, or randomness unless injected explicitly for that case.

## Anti-patterns

- Putting cross-model rules only in use cases (hard to test, duplicates domain logic).
- Importing ports or infrastructure in a service file.
- Using `*.service.ts` as a junk drawer for “anything that is not a capability”—if it touches the outside world, it is not a domain service.
- Renaming application orchestration as “service” in `operations/`—use `*.use-case.ts`.

## Related

- Single-model behavior: skill `clean-monorepo-core-capabilities`.
- Multi-layer order: skill `clean-monorepo-feature-workflow`.
- Models: skill `clean-monorepo-core-models`.
