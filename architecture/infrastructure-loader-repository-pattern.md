# Infrastructure Loader / Repository Pattern

This document defines the recommended split between loaders and repositories in `@infrastructure/*` packages.

## Responsibilities

### Loader

A loader is responsible for fetching raw data from infrastructure systems (CMS, database, HTTP API, SDK).

- Works with infrastructure-native shapes only.
- May include batching, caching, and deduplication (for example DataLoader).
- Must not depend on `@core/*` domain model types.
- Typical output: `Raw*` or vendor shapes (for example `ContentfulEntry`).

### Repository

A repository is responsible for implementing a core port and projecting raw infrastructure shapes into domain shapes.

- Depends on one or more loaders.
- Maps raw records into `@core/*/models` domain kits (shapes / primitives).
- Implements `@core/*/ports` contracts.
- Keeps orchestration thin: fetch via loader, map via mapper, return domain kit values.

## Why the split matters

Keeping loader and repository separate enables a powerful pattern:

1. Fetch one complete raw shape at infrastructure level.
2. Reuse that same raw shape for multiple domain projections.
3. Return minimal read models per core/use-case.

This supports efficient infrastructure access (single fetch path with caching/batching/dedup) while preserving bounded, application-specific domain models.

## Multi-core projection pattern

The same raw page entry can feed multiple repositories for different cores:

- `@core/pagebuilder`: `Page` with `pageStrips`
- `@core/seo`: `Page` with `alternativeUrls`
- `@core/page-resolution`: `Page` with only `slug`

All of these repositories can depend on the same loader that fetches the full raw page shape once, then map to distinct domain read models.

## Practical guidance

- Generate infrastructure artifacts in this order:
  1. `pnpm generate infrastructure-loader`
  2. `pnpm generate infrastructure-repository`
- Keep mapper logic explicit and testable (`raw -> domain`).
- Do not leak vendor SDK types into `@core/*` ports or models.
- Use core entrypoints only (`@core/<feature>/models`, `@core/<feature>/ports`).
