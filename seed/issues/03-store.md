# [F] The graph store — schema and `GraphStore` interface
<!-- labels: lane:foundation,size:M -->
**What**

Postgres via Drizzle, behind a `GraphStore` interface that everything reads through. Tables: `runs`, `issues`, `edges`, `rejections`, `cycle_breaks`, `schedule`, `llm_cache`, `leases`. It holds **the full graph** — every edge, above and below the blocking threshold. Full schema sketch in `docs/11-graph-store.md`.

A second binding of the same interface reads committed JSON fixtures — that's `DEMO_MODE`, and it means a judge with no database and no credentials still sees the whole app.

**Why it matters**

The pipeline writes; **everything else reads**. The UI polls the store and the MCP server answers agent queries from it. Neither should trigger inference, call the GitHub API, or recompute a topological sort.

Postgres rather than SQLite because the MCP server can be an HTTP endpoint for external clients, and a file-based database breaks the moment that deploys (#52). Neon's free tier is plenty — a hackathon backlog is kilobytes.

**This store is the only home of the graph.** Lattice never writes to GitHub, so if it isn't here, it doesn't exist.

Two columns are load-bearing and easy to overlook:

- **`edges.source`** — `'given'` / `'sub_issue'` / `'llm'` / `'agent_reported'`. `given` edges come from GitHub and are immutable: never re-scored, never cut during cycle breaking, and they win over any inference that contradicts them.
- **`edges.blocking`** — the materialised threshold decision, so the scheduler never re-evaluates it on read. Sub-threshold edges are **stored and displayed**, they just don't constrain anything.
- **`edges.pinned` / `edges.suppressed`** — the human nudge path (#50). The UI for them can wait, but add the columns now: retrofitting a column that changes pruning semantics is far worse than carrying two unused booleans.

Keep a `latest_run_id` per repo so reads are consistent — a read must never see half of one run and half of the next.

**Scope**

- `src/store/schema.ts`, `src/store/index.ts`, `src/store/fixtures.ts`

**Done when**

- [ ] All tables exist with migrations
- [ ] `GraphStore` covers every read the UI and MCP need
- [ ] The fixture binding satisfies the same interface with no database
- [ ] `latest_run_id` makes reads consistent
- [ ] `source`, `blocking`, `pinned`, `suppressed` present
- [ ] No edge is ever discarded for being low-confidence

**Depends on:** the shared types contract in #1.
