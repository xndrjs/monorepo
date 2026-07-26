# Infrastructure packaging strategy

This document defines how `@infrastructure/*` packages are split between shared technology primitives and bounded-context adapters.

Loader/repository responsibilities: [infrastructure-loader-repository-pattern.md](./infrastructure-loader-repository-pattern.md).

## Goals

- Keep vendor/technology details discoverable and co-located.
- Avoid duplicating low-level clients and helpers across context packages.
- Preserve clear ownership of adapters that implement `@core/*/ports`.
- Avoid “god” vendor packages that mix orchestration and business semantics.

## Strategy

1. **Technology/vendor-first** for shared primitives (clients, key/path helpers, SDK bootstrap).
2. **Context-bound** for concrete port adapters — stay in adapter packages aligned with the core feature they serve.
3. Shared technology packages hold **reusable low-level building blocks only** — not use-case orchestration or domain rules.
4. Extract a shared technology package only when reuse appears across **at least two** context adapter packages.
5. If a shared package grows large, split by **stable sub-capabilities** (e.g. clients vs persistence), not by broad domain workflows.

## Layout sketch

```txt
packages/
  infrastructure-<vendor>/              # shared primitives (when reuse is real)
    clients/
    …

  infrastructure-<vendor>-<context>/    # adapters for a specific @core context
    adapters/
    loaders/
    repositories/
    …
```

## Guardrails

- Keep shared technology packages free of orchestration and business semantics.
- Prefer small exports with clear ownership; do not merge all adapters into one monolithic vendor package.
- `@core/*` stays infrastructure-agnostic at port contracts.
- Do not mandate a big-bang refactor of every existing infrastructure package — apply on new work and when reuse is demonstrated.

## Trade-offs

More packages and exports to maintain; requires discipline so shared packages do not accumulate business behavior; occasional migration churn when extracting primitives.
