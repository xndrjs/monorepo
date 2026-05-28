---
name: clean-monorepo-spec-map
description: Decomposes a product idea into a spec map—coherent capability specs under specs/—before writing SPEC.md/DESIGN.md or implementation. Use when planning a new system, splitting a god-spec, or asking which specs/folders to create; not for implementing a single spec (use clean-monorepo-feature-workflow).
---

# Spec map (decomposition before specs)

## When to use

- A **new product** or large feature needs planning before any `specs/<spec-name>/` folders exist.
- An existing spec is a **god-spec** (unrelated workflows, mixed lifecycles, cannot be summarized in one sentence).
- The user asks for a **spec map**, **capability breakdown**, or **how to split specs**.

**Do not use** when a single `specs/<spec-name>/` is already scoped—use skill `clean-monorepo-feature-workflow` (Phase 1: `SPEC.md` + `DESIGN.md`).

**Bridge:** spec map = **which capabilities exist and how they depend on each other**; per-spec `SPEC.md` / `DESIGN.md` = **what each capability does and how to build it** (feature-workflow Phase 1).

---

## Purpose

A spec map is a **high-level decomposition** of a system into coherent specifications **before** per-spec docs or code.

Optimize for:

- clarity and low cognitive load
- explicit **excluded** concerns per spec (prevents god-specs)
- evolvability (one coherent capability at a time)
- **to-be** target structure—not execution planning

Describe **what coherent parts exist**, not how to implement or in what order.

---

## To-be vs delta (critical)

`specs/SPEC-MAP.md` documents the **target decomposition** (to-be): a **table of contents** for capability folders.

| Belongs in the spec map (to-be)              | Does **not** belong (delta — plans, tickets, agent runs) |
| -------------------------------------------- | -------------------------------------------------------- |
| Product overview (1–3 sentences)             | Implementation order or phases                           |
| Spec names + folder paths                    | `@core/*` / `@infrastructure/*` package names            |
| Purpose per spec (one line)                  | Port interfaces, method names, kit filenames             |
| Included flows (F1, F2, …)                   | Error catalogs, invariant lists, sequence diagrams       |
| **Excluded** concerns per spec               | “Shared context” tables wiring layers                    |
| Depends on (other specs or none)             | References to former god-spec paths / migration notes    |
| Product-level out of scope (optional, brief) | Checkpoint gates (“Phase 1a”, “after Fase 5”)            |

**Open questions** in the map: **domain/product** only (e.g. “Is reset in PoC scope?”). Technical choices belong in per-spec `SPEC.md` / `DESIGN.md` or in a separate plan—not in `SPEC-MAP.md`.

---

## What a spec is (in this repo)

A **spec** is a **meaningful system capability**—a folder under top-level [`specs/`](../../../specs/) that will eventually own `SPEC.md` and `DESIGN.md`.

| Good spec (capability) | Bad spec (artifact)  |
| ---------------------- | -------------------- |
| Vault lifecycle        | AddTodoButton        |
| Entry management       | Save API             |
| User authentication    | FetchUsers endpoint  |
| Billing workflow       | User table component |

A spec is **not**: one API endpoint, one UI page, one DB table, one use case, one technical module.

Specs usually emerge from: business capability, user-visible workflow, trust/security boundary, lifecycle/state machine, coherent domain model, major external integration, or operational process.

---

## Workspace layout (after the map is agreed)

```txt
specs/
  SPEC-MAP.md              # to-be index (this skill’s deliverable)
  <spec-name>/             # created when Phase 1 starts for that capability
    SPEC.md                # WHAT/WHY — domain language (feature-workflow Phase 1)
    DESIGN.md              # HOW — layers, kits, ports (feature-workflow Phase 1)
```

- **`<spec-name>`:** kebab-case, business-oriented (e.g. `vault-lifecycle`, `vault-entries`)—not necessarily equal to a `@core/*` package name.
- **One folder per vertical slice.** Unrelated bounded contexts → separate folders **before** implementation.
- **Only these files under `specs/`:** `SPEC-MAP.md` at the root; per slice, **only** `SPEC.md` and `DESIGN.md`. **No** `README.md`, redirects, `.gitkeep` in slice folders, or other collateral—documentation lives in those two files.
- **Flow diagrams:** Mermaid `sequenceDiagram` blocks live **inside `DESIGN.md`** per spec—not in `SPEC-MAP.md`.

Canonical architecture: [architecture/clean-architecture-oriented-monorepo.md](../../architecture/clean-architecture-oriented-monorepo.md).

---

## Process

### Step 1 — Identify major flows

Ask:

- What does the system actually do?
- What are the main user journeys?
- What are critical transitions?

Example:

```txt
User logs in
→ vault unlocks
→ entries become accessible
→ user edits entry
→ changes are persisted
```

At this stage: **no** implementation, frameworks, databases, or class hierarchies. Focus on **actors, flows, transitions**.

### Step 2 — Group flows by coherent responsibility

Flows that share domain concepts, lifecycle, security, or operational purpose usually belong to one spec.

Example: initialize vault, unlock, lock, reset → **vault-lifecycle** (state and session—not “InitializeVault use case” as a spec name).

### Step 3 — Split when reasons diverge

Split a spec when one or more of these differ:

| Reason                               | Example split                                          |
| ------------------------------------ | ------------------------------------------------------ |
| Different lifecycle / state machine  | Vault lifecycle vs vault entry CRUD                    |
| Different trust/security boundary    | Authentication vs profile management                   |
| Different primary model              | Search indexing vs document publishing                 |
| Different external system            | Payment provider vs CMS                                |
| Different operational concern        | Real-time sync vs static content                       |
| Independent evolve/test in isolation | Can change one capability without redefining the other |

### Step 4 — Size check

A spec should:

- be summarizable in **one sentence**
- be understandable in one sitting **once** `SPEC.md` exists
- represent a **coherent capability**, not an implementation milestone

**Too large** if: unrelated workflows, no one-sentence summary, or **excluded concerns** cannot be stated clearly without overlapping another spec.

---

## Spec map deliverable

**Done** when the user agrees on the decomposition and, if persisting, **`specs/SPEC-MAP.md`** is saved.

**Do not** write `SPEC.md`, `DESIGN.md`, implementation code, or **any other file** under `specs/` during spec-map work—**only** `SPEC-MAP.md`. Do not pre-create `specs/<spec-name>/` directories; slice folders appear when Phase 1 adds `SPEC.md` and `DESIGN.md`.

### `specs/SPEC-MAP.md` — required shape (lean, to-be)

Keep the file **short** (rough guide: well under ~50 lines for a typical PoC). Prefer a **table of contents** over prose.

```markdown
# Spec map — [Product / initiative name]

## Overview

[1–3 sentences: what the system does; PoC constraints only if product-relevant]

[Optional: one sentence on why the map is split into N specs]

## Table of contents

| Spec        | Folder               | Depends on      |
| ----------- | -------------------- | --------------- |
| [spec-name] | `specs/<spec-name>/` | — or other spec |

## [spec-name]

- **Purpose:** [one line]
- **Flows:** [F1 … · F2 … — labels only, no use-case class names]
- **Excluded:** [explicit list — critical]
- **Depends on:** [other spec name(s) or none]

(repeat per spec — same four bullets each time)

## Product out of scope (optional)

[Single short block: product capabilities not in this initiative]

## Open questions (optional)

- [Domain/product uncertainty only]
```

### Do not put in `SPEC-MAP.md`

- **Core models**, **invariants**, **boundaries**, **errors** → per-spec `SPEC.md` (and `DESIGN.md` for architecture boundaries)
- **Package / port / kit / use-case names** → `DESIGN.md` and code
- **Implementation order**, **phases**, **generator commands** → plan, ticket, or feature-workflow run—not the map
- Long tables duplicating content that will live in child specs

Per-spec **`SPEC.md` / `DESIGN.md`** rules live in skill **`clean-monorepo-feature-workflow`** Phase 1. **`clean-monorepo-core-package-design`** applies when **naming `@core/*` packages** during DESIGN—not during spec-map.

---

## What each future `SPEC.md` should contain (preview)

Detail deferred from the map; written in Phase 1 per spec:

1. **Purpose**
2. **Included flows / use cases**
3. **Excluded concerns**
4. **Core models** (semantic concepts)
5. **Main boundaries**
6. **Invariants / guarantees**
7. **Open questions** (spec-scoped)

`SPEC.md` stays **technology-agnostic**. `DESIGN.md` carries ports, adapters, packages, and sequence diagrams.

---

## Principles

### Table of contents, not blueprint

The map answers **which specs exist**, **what each owns**, and **what each must not own**. It does not preview architecture.

### To-be, not delta

Record the **target** capability split. Execution sequencing, scaffolding, and “we split from god-spec X” belong elsewhere.

### Avoid implementation gravity

Do not start from React components, REST endpoints, schema tables, or monorepo package layout. Start from flows and **excluded** boundaries.

### Monorepo split example (password vault)

| Map entry         | Rationale                                                             |
| ----------------- | --------------------------------------------------------------------- |
| `vault-lifecycle` | Initialize, unlock, lock, optional reset; session and locked/unlocked |
| `vault-entries`   | Entry list/CRUD while unlocked; different lifecycle from vault shell  |

A single `specs/password-vault/` folder can be valid for a **tiny** PoC; split when lifecycles or trust boundaries diverge—then replace with a lean `SPEC-MAP.md`, not a copy of the old monolith.

---

## Hard stops

**Stop and ask** if:

- The user wants implementation or per-spec `SPEC.md`/`DESIGN.md` before the map is agreed.
- One proposed spec still mixes unrelated lifecycles or trust boundaries.
- The draft map includes **implementation order**, **phase numbers**, **package/port/kit names**, or **error/invariant tables**.
- The map cannot name **excluded concerns** per spec.
- The map is **longer than needed** to serve as an index—trim or move detail to future child specs.
- **`README.md` or other files** were created under `specs/` or `specs/<spec-name>/`—remove them; only `SPEC-MAP.md` until Phase 1.

After the map is agreed, each `specs/<spec-name>/` advances via **`clean-monorepo-feature-workflow`** (user checkpoint between phases).

---

## Prompt template (LLM or agent)

```txt
Given this product idea:

[PRODUCT IDEA]

Create a lean spec map for the clean-template monorepo (specs/SPEC-MAP.md).

To-be only: target capability decomposition (table of contents).
Not delta: no implementation order, phases, package names, ports, kits, or use-case class names.

Include:
- Overview (1–3 sentences)
- Table: spec name | folder | depends on
- Per spec: purpose (one line), flows (F-labels), excluded concerns, depends on
- Optional: brief product out of scope; domain open questions only

Do not write SPEC.md, DESIGN.md, README.md, spec subfolders, or code.
Deliver only specs/SPEC-MAP.md; keep it short.
```

---

## Skill map

| After spec map                   | Skill                                       |
| -------------------------------- | ------------------------------------------- |
| Per-spec `SPEC.md` + `DESIGN.md` | `clean-monorepo-feature-workflow` (Phase 1) |
| `@core/*` package split/naming   | `clean-monorepo-core-package-design`        |
| Implementation phases 2–6        | `clean-monorepo-feature-workflow`           |
| Ambiguous routing                | `clean-architecture-monorepo`               |

---

## Success criterion

The map lets someone see **which capabilities exist**, **how they depend on each other**, and **what is explicitly out of each spec**—without reading architecture or a delivery plan.
