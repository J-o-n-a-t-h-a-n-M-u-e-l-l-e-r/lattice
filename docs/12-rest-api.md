# 12 · REST API

The backend's read surface for the web app. Same store queries that back the MCP tools — one computation, two audiences.

Base: `https://<backend>/api`. JSON throughout. Bearer auth (`LATTICE_API_TOKEN`); the web app holds only this token, never a database URL, GitHub token or model key.

## Endpoints

```
GET  /api/graph?repo=owner/name
     -> { run_id, generated_at, nodes: [...], edges: [...], stats: {...} }
```

The whole graph for the latest run, precomputed and ready to lay out. **The full edge set** — every edge including non-blocking and low-confidence ones, each carrying `blocking`, `confidence`, `type`, `source`, `rationale` and `evidence`. The UI decides what to draw; transitive reduction happens there, behind a toggle.

Nodes carry everything needed to render without a second call: `number`, `title`, `state`, `labels`, `wave`, `effort_days`, `blast_radius`, `on_critical_path`, `slack_days`, `ready`, `html_url`.

```
GET  /api/runs?repo=owner/name&limit=20
     -> [{ id, trigger, started_at, duration_ms, status,
            requests, edges_proposed, edges_kept, edges_blocking }]

GET  /api/runs/:id
     -> { ...summary, rejections: [...], cycle_breaks: [...], below_threshold: [...] }
```

Backs `/runs` — the accountability surface that replaced the review queue.

```
GET  /api/issues/:number?repo=owner/name
     -> { issue, blockers: [...], dependents: [...] }
```

Backs the node detail panel. Blockers and dependents come with the full reasoning for each edge, so the panel never needs a third call.

```
GET  /api/edges/:blocked/:blockedBy?repo=owner/name
     -> { type, confidence, source, rationale, evidence, first_seen_run, blocking }
```

Why an edge exists. The REST twin of the `explain_dependency` MCP tool — **the only place an inferred edge's reasoning exists**, since nothing is written to GitHub.

```
POST /api/runs           { repo }        -> { run_id, status }   # manual trigger
POST /api/webhook                        -> 202                  # GitHub issue events
```

## Conventions

- **Everything is precomputed.** A route reads the store and serialises. No route runs inference, calls GitHub, or recomputes a topological sort. See [`11-graph-store.md`](11-graph-store.md#caching-in-three-layers).
- **`run_id` is the cache key.** Responses carry it and an `ETag`; a completed run invalidates. The UI can poll `/api/graph` cheaply and diff on `run_id`.
- **Reads are consistent.** Every response for one request is served from a single `latest_run_id` — never half of one run and half of the next.
- **`DEMO_MODE=1` serves the committed fixtures** through the same routes, so the whole API works with no database and no credentials.

## Errors

Standard codes with a JSON body: `{ error, detail }`. Two worth handling explicitly in the UI: **404** when a repo has never been analysed (offer to trigger a run), and **503** while the first run is still in flight (the graph does not exist yet — say so, don't render an empty canvas).
