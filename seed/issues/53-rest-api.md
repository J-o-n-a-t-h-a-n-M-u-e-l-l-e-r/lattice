# [G] The REST API
<!-- labels: lane:github-io,size:L -->
**What**

The backend's read surface for the web app. Endpoints and payload shapes are specified in `docs/12-rest-api.md` -- build to that contract.

`GET /api/graph`, `GET /api/runs`, `GET /api/runs/:id`, `GET /api/issues/:number`, `GET /api/edges/:blocked/:blockedBy`, plus `POST /api/runs` and `/api/webhook`. Authenticated with `LATTICE_API_TOKEN`.

**Why it matters**

The web app is a **separate service**. It holds no database URL, no GitHub token and no model key -- it fetches JSON and draws it. This API is the entire seam between the two, which makes it worth getting right early: publish the contract in hour one and the UI lane never blocks on the backend.

It also backs the same store queries as the MCP tools. One computation, two audiences -- a human looking at the graph and an agent asking what to work on next.

**Three rules:**

- **Everything is precomputed.** No route runs inference, calls GitHub, or recomputes a topological sort. Routes read the store and serialise.
- **`run_id` is the cache key.** Return it plus an `ETag`; a completed run invalidates. The UI polls cheaply and diffs on `run_id`.
- **Reads are consistent.** Serve every response from a single `latest_run_id` -- never half of one run and half of the next.

`DEMO_MODE=1` must serve the committed fixtures through the same routes, so the whole API works with no database.

**Scope**

- `apps/backend/src/api/**`

**Done when**

- [ ] Every endpoint in `docs/12-rest-api.md` returns the documented shape
- [ ] `GET /api/graph` returns the **full** edge set with `blocking` marked, not filtered
- [ ] 404 for a never-analysed repo, 503 while the first run is in flight
- [ ] Auth rejects unauthenticated requests
- [ ] Works end to end under `DEMO_MODE=1`
- [ ] No route triggers inference or a GitHub call

**Depends on:** the store in #3, the types contract in #1, and graph serialisation in #51.
