# 11 · The graph store

Where the graph lives between runs, and how it is retrieved fast.

## Why a store at all

The pipeline is expensive and event-triggered; reads are cheap and constant. The UI polls it, the MCP server answers agent queries from it, and Copilot dispatch reads it. None of those should trigger inference, hit the GitHub API, or recompute a topological sort.

So: **the pipeline writes, everything else reads.**

```
   pipeline run ──write──►  ┌───────────┐  ◄──read──  web UI
                            │   store   │  ◄──read──  MCP server
   GitHub blocked_by ◄──────┤  + cache  │  ◄──read──  Copilot dispatch
        (applied edges)     └───────────┘
```

## What is truth, and what is derived

This distinction matters and is easy to blur:

| | Lives in | Why |
|---|---|---|
| **Applied `blocked_by` edges** | **GitHub** | Still the source of truth for edges we committed. Delete Lattice and they remain. Every other tool sees them. |
| Everything else — reasoning, confidence, evidence, rejected edges, sub-threshold edges, cycle breaks, waves, critical path, blast radius, run history | **The store** | GitHub has nowhere to put any of it. |

The store is **not** a second copy of GitHub's dependency data pretending to be authoritative. It is the layer holding the ~90% of the computation GitHub cannot represent, plus a cache of the parts it can.

## Recommended: Postgres + Drizzle

Serverless-compatible, which matters because the MCP server must be an HTTP endpoint Copilot can reach — a file-based database breaks the moment that deploys. Neon's free tier is plenty; a hackathon backlog is kilobytes.

Put everything behind a `GraphStore` interface so this is swappable. `DEMO_MODE=1` binds the same interface to committed JSON fixtures with no database at all, which is what lets a judge run the app with no credentials.

## Schema sketch

```sql
-- One row per pipeline execution. The audit trail.
runs (
  id, repo, trigger,                    -- 'issues.opened' | 'schedule' | 'manual' | 'agent'
  started_at, finished_at,
  model, cluster_size,
  requests, edges_proposed, edges_kept, edges_written,
  rejections_json,                      -- counts by reason
  status                                -- 'ok' | 'partial' | 'failed'
)

-- The issue snapshot the run saw. Avoids re-fetching GitHub on every read.
issues (
  repo, number PRIMARY KEY, database_id, node_id,
  title, body, labels, milestone, state, effort_days,
  fetched_at
)

-- Every edge the pipeline has an opinion about, including ones never written.
edges (
  repo, blocked, blocked_by,            -- composite PK
  type, confidence, source, rationale,
  evidence_issue, evidence_quote,
  written_to_github  boolean,           -- did WE write it
  authored_by        text,              -- 'lattice' | 'given' — governs pruning
  pinned             boolean DEFAULT false,   -- human nudge: never remove
  suppressed         boolean DEFAULT false,   -- human nudge: never propose again
  first_seen_run, last_seen_run
)

-- What the model proposed and the validators threw out. Feeds the quality metrics.
rejections (run_id, blocked, blocked_by, reason, confidence, rationale)

-- Cycles the pipeline broke, and what it chose.
cycle_breaks (run_id, cycle_json, victim_blocked, victim_blocked_by, alternatives_json)

-- The derived schedule. Recomputed per run, read constantly.
schedule (
  repo, issue_number,
  wave, blast_radius, on_critical_path, slack_days, ready,
  computed_at
)

-- Model response cache. Survives restarts; the daily quota depends on it.
llm_cache (key PRIMARY KEY, model, response_json, created_at)
```

`authored_by` is what makes automatic pruning safe. Lattice may remove edges it wrote and no longer infers; it must never touch a `given` edge someone else created. Without this column an automatic writer eventually becomes a vandal.

## Caching, in three layers

Each solves a different problem — don't collapse them:

**1 · LLM response cache** (`llm_cache`, keyed by hash of model + system prompt + cluster content). The most important one. During prompt iteration you re-run constantly against unchanged input; without this you burn a 50-request daily quota re-deriving identical answers. It also makes demo re-runs instant.

**2 · Derived schedule** (`schedule` table). Waves, critical path and blast radius are recomputed once per run and read thousands of times. Never compute them in a request handler.

**3 · Read cache in front of the store.** An in-process LRU (~60s TTL) plus HTTP `Cache-Control` on the read routes. `list_ready_work` is the hot path — five agents polling it should not become five database round-trips each.

Invalidate 1 by content hash, 2 and 3 by `run_id`: a completed run bumps the version and everything downstream refreshes.

## Retrieval

The store is the read API for the whole system:

| Consumer | Wants |
|---|---|
| Graph view | full node + edge set for a repo, latest run |
| `list_ready_work` | `schedule` rows where `ready`, ordered by blast radius |
| `explain_dependency` | one `edges` row with rationale and evidence — this is what replaced receipt comments |
| Dispatch | ready set plus conflict scores |
| Quality metrics | `runs` + `rejections` joined against the gold set |

Keep a `latest_run_id` per repo so every read is consistent — a read must never see half of one run and half of the next.

## Human nudges — low priority, but design the columns now

There is no approval gate, and none is planned. Humans influence the graph by **correcting it after the fact**, not by standing in front of it:

- **`pinned`** — an edge a human asserted. The pipeline never removes it and cycle-breaking never cuts it.
- **`suppressed`** — an edge a human rejected. Never proposed again, never written.
- Editing `blocked_by` directly on GitHub also works and is picked up as a `given` edge on the next run. This is the zero-UI nudge path, and it's free.

Both columns are two booleans and a filter. Add them to the schema now even though the UI for them can wait — retrofitting a column that changes pruning semantics is much worse than carrying two unused flags.

## What was removed

`decisions.json` and the human approve/reject log are gone along with the review queue. The `rejections` table serves the honest-record purpose — it captures what the *validators* threw out, which is the more interesting number anyway, since it's produced automatically on every run rather than depending on someone doing review.
