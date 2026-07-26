# Agent instructions (clean-architecture-monorepo)

## Architecture

Read [architecture/clean-architecture-oriented-monorepo.md](./architecture/clean-architecture-oriented-monorepo.md) for layer rules, boundaries, and composition.

Route ambiguous work via skill `clean-architecture-monorepo` under `.skills/`.

## Agent skills — symlink layout

| Path                                                 | Role                                |
| ---------------------------------------------------- | ----------------------------------- |
| `.skills/<name>/SKILL.md`                            | **Only path to edit**               |
| `.cursor/skills`, `.claude/skills`, `.github/skills` | Symlinks to `.skills/` (same inode) |

When updating skills:

- Write full content to `.skills/<name>/SKILL.md`.
- Do **not** create redirect stubs (`See canonical guide in .skills/...`) — they erase the only copy.
- Do **not** write separate copies under `.cursor/skills` or `.claude/skills`.

## Skill map (common intents)

| Intent                                                       | Skill                                  |
| ------------------------------------------------------------ | -------------------------------------- |
| Multi-capability planning / god-spec split                   | `clean-monorepo-spec-map`              |
| Multi-layer feature (SPEC → kits → infra → composition)      | `clean-monorepo-feature-workflow`      |
| Domain kits (`*.shape.ts` / `*.primitive.ts` / `*.proof.ts`) | `clean-monorepo-core-models`           |
| Domain errors (`errors/*.error.ts`)                          | `clean-monorepo-plop` (`domain-error`) |
| Capabilities (`forShape` / `forPrimitive`, `.attach`)        | `clean-monorepo-core-capabilities`     |
| Domain services (`*.service.ts`)                             | `clean-monorepo-core-services`         |
| Ports (role-oriented)                                        | `clean-monorepo-core-ports`            |
| Composition roots                                            | `clean-monorepo-composition-root`      |
| Boundary / import violations                                 | `clean-monorepo-boundaries`            |
| Plop generators / `pnpm generate`                            | `clean-monorepo-plop`                  |

Full router table: skill `clean-architecture-monorepo`.

## Scaffolding

Use Plop (`pnpm generate` or MCP `clean-monorepo-plop`) for generator-owned artifacts—skill `clean-monorepo-plop`.

Domain order: **primitive → shape → proof**, then **capabilities** / services, then ports / use cases. Domain errors: `domain-error` under `errors/` (not `models/`). Do **not** use `core-model`.

Apps: **no app generator**—create `apps/<name>/` (with `package.json`) before `composition-root`.
