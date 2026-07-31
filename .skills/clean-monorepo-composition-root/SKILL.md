---
name: clean-monorepo-composition-root
description: Creates or extends app composition roots under apps/*/composition/ in the clean-template monorepo. Use when wiring use cases to infrastructure, defining app-scoped vs request-scoped dependencies, or running pnpm generate composition-root—never hand-roll a new composition file without the generator scaffold.
---

# Composition root (`apps/*/composition/`)

## One composition module per runtime

**Encouraged:** one `*.composition.ts` per **runtime boundary** for the app—not one file per `@core/<feature>`.

| Runtime | Typical file                  | Public export (example) |
| ------- | ----------------------------- | ----------------------- |
| Server  | `<app>-server.composition.ts` | `get<App>ServerRoot`    |
| Client  | `<app>-client.composition.ts` | `get<App>ClientRoot`    |
| Neutral | `<app>.composition.ts`        | `get<App>Root`          |

- Wire **all** features’ use cases for that runtime in the same root.
- Do **not** split into `billing-server.composition.ts`, `catalog-server.composition.ts`, etc.
- Server-only and client-only are mutually exclusive in the generator.

Architecture risk table bans per-feature composition files (fragmentation) and god roots that mix runtimes without guards.

## Mandatory scaffold

**Always** create a new composition module with the generator. NEVER add a bare `*.composition.ts` by hand:

```sh
pnpm generate composition-root
```

Prompts: target app, server-only / client-only, file name (defaults follow the table above).

The template enforces private infrastructure helpers and the split between **app-scoped** and **request-scoped** dependencies. Hand-written roots tend to export infra factories or mix lifetimes incorrectly.

Extending an **existing** generator-created file is fine; adding a **new** composition module without `pnpm generate composition-root` is not. If the target file already exists, generation fails—add wiring to the existing runtime file instead.

## Role

Composition is the **only** place where:

- Concrete `@infrastructure/*` adapters meet `@core/*/ports`
- `createXUseCase(deps)` factories receive port implementations

**Not** composition’s job:

- Wiring capability `.attach` to domain kits — that belongs in **`operations/`** (domain). Export `XxxCapabilities` from capabilities (or `operations/index.ts`); use cases import `@core/<feature>/operations`.
- Business rules, validation, or domain transforms.

**No business rules** here—only infrastructure wiring, framework setup, and lifetime boundaries.

Architecture:

[architecture/clean-architecture-oriented-monorepo.md](../../architecture/clean-architecture-oriented-monorepo.md) — _Composition root_.

## Generated structure

```ts
// TODO: customize the request context, e.g. correlationId
type RequestContext = never;

// App-scoped dependencies — module level (SDK clients, config, pools).
// const cmsClient = createCmsClient({ ... });

function getInfrastructure(ctx: RequestContext) {
  return {
    // cms: new CmsAdapter(cmsClient, ctx),
  };
}

/**
 * Returns use cases wired for one request context.
 */
export function getWebRoot(ctx: RequestContext) {
  const infra = getInfrastructure(ctx);

  return {
    // getInvoice: createGetInvoiceUseCase(infra),
  };
}
```

Server-only modules use `getServerInfrastructure` / `getXxxServerRoot`; client-only use `getClientInfrastructure` / `getXxxClientRoot`. Infrastructure helpers stay **module-private**—export only `get*Root`.

Use cases pull domain operations from `@core/<feature>/operations`—never from composition.

## App-scoped vs request-scoped

| Lifetime           | Where                                         | Examples                                                               |
| ------------------ | --------------------------------------------- | ---------------------------------------------------------------------- |
| **App-scoped**     | Module-level `const` outside the infra helper | SDK clients, connection pools, config loaded once, stateless adapters  |
| **Request-scoped** | Built inside `get*Infrastructure(ctx)`        | Per-request DB session, logger with correlation id, tenant-bound repos |

**Rules:**

- App-scoped deps MUST NOT capture `RequestContext` in closures created at module load.
- Request-scoped deps MUST be created inside the private infra helper (or helpers it calls)—never cached at module scope without keyed-by-request semantics.
- `getXxxRoot(ctx)` MUST call the private infra helper and pass the result into use-case factories only.

Customize `RequestContext` at the top of the file to match the app (Next request, CLI args, job metadata, etc.).

On server-only modules, prefer `React.cache` only for shared per-request state (e.g. DataLoader registry), then build adapters inside the private infra helper.

## Wiring checklist

- [ ] One composition file per **runtime** (server / client / neutral)—not per `@core` feature.
- [ ] File created via `pnpm generate composition-root`.
- [ ] Each port used by wired use cases has an adapter in the private infra helper (or app-scoped field reused there).
- [ ] Use cases imported from `@core/<feature>/use-cases` only—no deep paths.
- [ ] Capabilities attached in `operations/`; composition does **not** wire `.attach` or domain behavior.
- [ ] Rest of the app imports `getXxxRoot` (or thin wrappers)—not `@infrastructure/*` directly.
- [ ] Infra helpers are **not** exported.

## Anti-patterns

- One `*.composition.ts` per `@core/<feature>` (fragmentation).
- Mixing server and client wiring in one file without `server-only` / `client-only` guards.
- `createUserCapabilities(…).attach(…)` (or similar) in composition—belongs in `operations/`.
- New composition file copied from another app without running the generator.
- Instantiating infrastructure inside route handlers instead of through `get*Root`.
- Exporting `get*Infrastructure` for app call sites.
- Domain validation or pricing rules in composition.
- Importing `@core/*` from infrastructure packages (inverse dependency).

## Related

- Domain capabilities wiring: skill `clean-monorepo-core-capabilities`.
- Ports: skill `clean-monorepo-core-ports`.
- Multi-layer order: skill `clean-monorepo-feature-workflow` (Phase 6).
- Scaffold: skill `clean-monorepo-plop`.
- Boundaries: skill `clean-monorepo-boundaries`.
