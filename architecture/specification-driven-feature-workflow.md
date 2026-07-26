# Specification-driven feature workflow

Lightweight specification workflow for multi-layer features.

**Agents:** follow skill [`clean-monorepo-feature-workflow`](../.skills/clean-monorepo-feature-workflow/SKILL.md) (phases, gates, hard stops). Multi-capability decomposition: skill [`clean-monorepo-spec-map`](../.skills/clean-monorepo-spec-map/SKILL.md).

## Why lean specs

Features span kits, operations, use cases/ports, and infrastructure. Without a shared target, agents and developers diverge or leak across layers. Heavy Spec-Driven task lists inflate context; package layout + ESLint already enforce Clean Architecture, so this repo keeps specs small: conceptual alignment without execution prose in the docs.

## Spec location

| Path                          | Role                                            |
| ----------------------------- | ----------------------------------------------- |
| `specs/SPEC-MAP.md`           | Optional product ToC of capabilities (spec-map) |
| `specs/<spec-name>/SPEC.md`   | What/why — domain language only                 |
| `specs/<spec-name>/DESIGN.md` | How — to-be inventory of architecture artifacts |

No production code during specification. Slice folders use kebab-case business names.

### `SPEC.md`

Intent, actors, stories, acceptance criteria—technology- and vendor-agnostic. No ports, adapters, paths, frameworks, or SDKs.

### `DESIGN.md`

**To-be catalog** (not a delta): target `@core/*`, kits, errors, capabilities/services, role ports, use cases, adapters. Sequence diagrams live here when useful.

## Incremental implementation

After approval of `SPEC.md` + `DESIGN.md` (or delivery mode—see feature-workflow skill):

```text
Kits (primitive → shape → proof) → Capabilities / services → Ports & use cases → Adapters → Composition
```

Halt for approval between phases by default. Large/critical work may ship a PR with **only** `specs/<spec-name>/*` before code.

## Trade-offs

**Gains:** less doc bloat; architecture + lint as guardrails; clear SPEC vs DESIGN split.  
**Risks:** still needs human review that SPEC stays domain-only and DESIGN stays to-be.
