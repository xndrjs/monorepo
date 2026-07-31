# Plop MCP server

Exposes repository Plop generators to AI agents via **MCP (stdio)**.

## Config

[`.mcp.json`](../../.mcp.json) at the repo root (`.cursor/mcp.json` is a symlink for Cursor).

| Tool                   | Description                                                   |
| ---------------------- | ------------------------------------------------------------- |
| `list_generators`      | All generators with prompts metadata                          |
| `get_generator_schema` | Prompt schema for one generator (`name`)                      |
| `run_generator`        | Run a generator (`generator`, optional `data` prompt answers) |
| `list_utils_modules`   | Helper modules under `plop/generators` and `plop/common`      |
| `list_utils_functions` | Exported functions in a utils module                          |
| `call_utils_function`  | Invoke a utils helper (`module`, `fn`, optional `args`)       |

**Agent workflow:** `list_generators` → `get_generator_schema` → `run_generator`.

Domain kit generators (xndrjs): `primitive`, `shape`, `capabilities`, `proof`, `domain-error`. There is no `core-model` — use those kit generators instead. Other common names: `core-feature`, `core-port`, `core-use-case`, `composition-root`, `infrastructure-loader`, `infrastructure-repository`, `ui-package`. Call `list_generators` for the live list.

Cursor and Claude spawn the server from `.mcp.json` when MCP is enabled.

Start manually (repo root):

```bash
pnpm mcp:plop
```

Equivalent: `pnpm --prefix tools/mcp-server mcp`.

## Setup

From repo root (workspace includes `tools/*`):

```bash
pnpm install
```

Or standalone:

```bash
cd tools/mcp-server && pnpm install --ignore-workspace
```

## Notes

- Loads `plop/plopfile.cjs` from the monorepo root (resolved from this package location, not `process.cwd()`).
- Generator actions perform real file writes; use in a sandbox when experimenting.
- Fallback without MCP: `pnpm generate <generator-name>` from the repo root.
