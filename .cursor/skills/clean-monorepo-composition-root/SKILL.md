---
name: clean-monorepo-composition-root
description: Creates or extends app composition roots under apps/*/composition/ in the clean-template monorepo. Use when wiring use cases to infrastructure, defining app-scoped vs request-scoped dependencies, or running pnpm generate composition-root—never hand-roll a new composition file without the generator scaffold.
---

# Composition root (`apps/*/composition/`)

## One composition module per feature

**Encouraged:** one `*.composition.ts` per bounded context / `@core/<feature>` (e.g. `billing.composition.ts`, `catalog.composition.ts`).

- Keeps each provider focused on the ports that feature’s use cases need.
- Avoids a single god composition root that wires every adapter and use case in the app.
- Multiple files under `composition/` are normal; each is created with `pnpm generate composition-root`.

## Mandatory scaffold

**Always** create a new composition module with the generator. NEVER add a bare `*.composition.ts` by hand:

```sh
pnpm generate composition-root
```

Prompts: target app, file name (default `<app>.composition.ts`—prefer `<feature>.composition.ts`).

The template enforces the **infrastructure provider** pattern and the split between **app-scoped** and **request-scoped** dependencies. Hand-written roots tend to skip `getForContext(ctx)` and mix lifetimes incorrectly.

Extending an **existing** generator-created file is fine; adding a **new** composition module without `pnpm generate composition-root` is not.

## Role

Composition is the **only** place where:

- Concrete `@infrastructure/*` adapters meet `@core/*/ports`
- `createXUseCase(deps)` factories receive port implementations

**Not** composition’s job:

- Wiring capability `.attach` to domain kits — that belongs in **`operations/`** (domain). Export `XxxCapabilities` from capabilities (or `operations/index.ts`); use cases import `@core/<feature>/operations`.
- Business rules, validation, or domain transforms.

**No business rules** here—only infrastructure wiring, framework setup, and lifetime boundaries.

Architecture:

[architecture/clean-architecture-oriented-monorepo.md](../../../architecture/clean-architecture-oriented-monorepo.md) — _Composition root_.

## Generated structure

```ts
type RequestContext = /* customize: correlationId, tenantId, userId, ... */;

class BillingCompositionInfrastructureProvider {
  // App-scoped: fields or lazy getters on the provider instance
  private readonly paymentGateway = new StripePaymentAdapter(/* ... */);

  // Request-scoped: methods that take RequestContext
  getAuditLogger(ctx: RequestContext) {
    return new RequestAuditLogger(ctx.correlationId);
  }

  getForContext(ctx: RequestContext) {
    return {
      paymentGateway: this.paymentGateway,
      auditLogger: this.getAuditLogger(ctx),
    };
  }
}

const infrastructureProvider = new BillingCompositionInfrastructureProvider();

export function getBillingRoot(ctx: RequestContext) {
  const infrastructure = infrastructureProvider.getForContext(ctx);

  return {
    createInvoice: createCreateInvoiceUseCase({
      paymentGateway: infrastructure.paymentGateway,
      auditLogger: infrastructure.auditLogger,
    }),
  };
}
```

Use cases pull domain operations from `@core/billing/operations` (e.g. `userCapabilities`)—never from composition.

## App-scoped vs request-scoped

| Lifetime           | Where                                | Examples                                                                      |
| ------------------ | ------------------------------------ | ----------------------------------------------------------------------------- |
| **App-scoped**     | Provider fields or lazy getters      | SDK clients, connection pools, config loaded once, stateless adapters         |
| **Request-scoped** | Methods `(ctx: RequestContext) => …` | Per-request DB session, logger with correlation id, tenant-bound repositories |

**Rules:**

- App-scoped deps MUST NOT capture `RequestContext` in closures created at module load.
- Request-scoped deps MUST be created inside `getForContext(ctx)` (or helpers it calls)—never cached on the provider without keyed-by-request semantics.
- `getXxxRoot(ctx)` MUST call `infrastructureProvider.getForContext(ctx)` and pass the result into use-case factories only.

Customize `RequestContext` at the top of the file to match the app (Next request, CLI args, job metadata, etc.).

## Wiring checklist

- [ ] One composition file per feature (or clear submodule), not one mega-root for the whole app.
- [ ] File created via `pnpm generate composition-root`.
- [ ] Each port used by that feature’s use cases has an adapter in `getForContext` (or app-scoped field reused there).
- [ ] Use cases imported from `@core/<feature>/use-cases` only—no deep paths.
- [ ] Capabilities attached in `operations/`; composition does **not** wire `.attach` or domain behavior.
- [ ] Rest of the app imports `getXxxRoot` (or thin wrappers)—not `@infrastructure/*` directly.

## Anti-patterns

- Single composition root wiring every feature’s use cases and adapters (god composition).
- `createUserCapabilities(UserModel.from)` (or similar) in composition—belongs in `operations/`.
- New composition file copied from another app without running the generator (missing provider skeleton).
- Instantiating infrastructure inside route handlers instead of through `getForContext`.
- Storing `RequestContext` on a singleton provider field.
- Domain validation or pricing rules in composition.
- Importing `@core/*` from infrastructure packages (inverse dependency).

## Related

- Domain capabilities wiring: skill `clean-monorepo-core-capabilities`.
- Multi-layer order: skill `clean-monorepo-feature-workflow` (Phase 5).
- Scaffold: skill `clean-monorepo-plop`.
- Boundaries: skill `clean-monorepo-boundaries`.
