# [F] The graph store — schema and `GraphStore` interface
<!-- labels: lane:foundation,size:M -->
**What**

Postgres via Drizzle, behind a `GraphStore` interface that everything reads through. Tables: `runs`, `issues`, `edges`, `rejections`, `cycle_breaks`, `schedule`, `llm_cache`, `leases`. Full schema sketch in `docs/11-graph-store.md`.

A second binding of the same interface reads committed JSON fixtures — that's `DEMO_MODE`, and it means a judge with no database and no credentials still sees the whole app.

**Why it matters**

The pipeline writes; **everything else reads**. The UI polls the store, the MCP server answers agent queries from it, dispatch reads it. None of those should trigger inference, call the GitHub API, or recompute a topological sort.

Postgres rather than SQLite because the MCP server has to be an HTTP endpoint Copilot can reach, and a file-based database breaks the moment that deploys. Neon's free tier is plenty — a hackathon backlog is kilobytes.

Two columns are load-bearing and easy to overlook:

- **`edges.authored_by`** — `'lattice'` or `'given'`. Writes are automatic, so the pipeline must be able to remove stale edges it wrote without ever touching one a human or another tool created. Without this column an automatic writer eventually becomes a vandal.
- **`edges.pinned` / `edges.suppressed`** — the human nudge path (#50). The UI for them can wait, but add the columns now: retrofitting a column that changes pruning semantics is far worse than carrying two unused booleans.

Keep a `latest_run_id` per repo so reads are consistent — a read must never see half of one run and half of the next.

**Scope**

- `src/store/schema.ts`, `src/store/index.ts`, `src/store/fixtures.ts`

**Done when**

- [ ] All tables exist with migrations
- [ ] `GraphStore` covers every read the UI and MCP need
- [ ] The fixture binding satisfies the same interface with no database
- [ ] `latest_run_id` makes reads consistent
- [ ] `authored_by`, `pinned`, `suppressed` present

**Depends on:** the shared types contract in #1.
