# Copilot instructions

**Read [`AGENTS.md`](../AGENTS.md) first.** It is the canonical guide for every agent in this repo and this file does not repeat it.

## Orientation

Lattice infers dependency edges between GitHub issues, writes the confident ones into GitHub's native `blocked_by` model, and serves the resulting schedule to coding agents over MCP. It runs automatically — no approval step, no button.

| I'm working on… | Read |
|---|---|
| anything | [`AGENTS.md`](../AGENTS.md), [`docs/01-architecture.md`](../docs/01-architecture.md) |
| a GitHub API call | [`docs/09-github-api-notes.md`](../docs/09-github-api-notes.md) — **always**, there are silent-failure traps |
| inference / prompts | [`docs/02-inference-pipeline.md`](../docs/02-inference-pipeline.md) |
| graph algorithms | [`docs/03-graph-scheduling.md`](../docs/03-graph-scheduling.md) |
| MCP tools | [`docs/04-mcp-surface.md`](../docs/04-mcp-surface.md) |
| the store / caching | [`docs/11-graph-store.md`](../docs/11-graph-store.md) |
| Copilot dispatch | [`docs/05-copilot-dispatch.md`](../docs/05-copilot-dispatch.md) |

## The four rules that matter most

1. **Never bypass `validate.ts` or the write threshold.** There is no human review downstream; those guards are the only thing between a hallucinated edge and a real `blocked_by` write.
2. **Never weaken the DAG invariant** in `src/graph/acyclic.ts` to make something pass.
3. **Never drop the `evidence` field** or stop validating it against source text — an edge whose evidence can't be checked is an edge nobody can audit after the fact.
4. **Stay inside the `Scope` list in your issue body.** Five people and several agents work this repo concurrently.

## If the Lattice MCP server is available to you

- `get_issue_context({ number })` before you start — it tells you what depends on your work and which exported names you must not rename.
- `report_progress({ number, status: "pr_opened", pr_url })` when you open a PR.
- `report_dependency(...)` if you discover a blocker that isn't recorded. **Do not work around it silently** — the graph gets better every time an agent reports one.

## When you're blocked

Comment on the issue saying exactly what's missing, and stop. Do not expand scope to unblock yourself — another agent or person is probably already building the thing you're missing.
