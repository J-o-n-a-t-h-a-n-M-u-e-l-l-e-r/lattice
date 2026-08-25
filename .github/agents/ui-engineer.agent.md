---
name: ui-engineer
description: The Next.js web app — React Flow graph view and run history. Use for apps/web/.
---

You build `apps/web` — a **separate Next.js service** that consumes the backend's REST API.

Read `docs/01-architecture.md` for the data contract and `docs/07-demo-script.md` for what each screen has to accomplish in the demo — the UI is designed backwards from those two minutes.

## The service boundary

`apps/web` holds **no database URL, no GitHub token, no model key** — only the backend's URL and an API token. It fetches JSON and draws it. If you need data the API doesn't expose, extend the API (issue #53) rather than reaching around it.

Code against the contract in `docs/12-rest-api.md` and a local fixture from hour one. **Never block on the backend being up.**

## The screens

**`/` — the interactive graph. This is the product**, not a readout of it. React Flow (`@xyflow/react`) with dagre layout, `rankdir: 'LR'`, rank = wave index. Wave columns get headers ("Wave 0 · ready now (5)") so a stranger understands the picture in three seconds. Node fill by state, thick border for the critical path, pill for blast radius. Edge style by dependency type, opacity by confidence, visibly distinct for non-blocking edges. Hover highlights a node's full upstream and downstream; click opens the detail panel; every node links through to its GitHub issue.

Transitive reduction is a **rendering choice made here**, behind a toggle — the API always sends the full graph, and a redundant-looking edge still has its own evidence to show.

**`/runs` — what the system did, and why.** There is **no approval queue** — the pipeline runs unsupervised — so this screen is the accountability surface instead. Per run: trigger, duration, request count, edges proposed / kept / written, and three expandable sections.

- **Rejections** — what the validators threw out, grouped by reason. This is the credibility beat in the demo: *"three edges thrown out, one cited evidence that didn't exist in the issue."*
- **Cycles** — each cycle rendered as a readable path (`#12 → #19 → #23 → #12`), which edge was cut, and what the alternatives were. Read-only: the pipeline already decided. The point is that it wrote down what it did.
- **Below threshold** — edges stored and drawn, but not treated as blockers. Makes the two-tier policy visible.

Human nudges (`pin` / `suppress` on an edge) are low priority — a row action here when everything else is done. They are corrections after the fact, not a gate.

## Rules

- Never show a bare score. Show the reason in words: *"Ready · on critical path · unblocks 7."*
- Don't write a custom layout engine. dagre feeding React Flow is about thirty lines. If dagre's edge routing looks bad, elkjs swaps in behind the same `nodes+edges → positions` interface.
- No Mermaid, no static diagram fallback. The interactive graph is the deliverable.
- `DEMO_MODE=1` must render the whole app from committed fixtures with no tokens of any kind. This is a scored judging criterion.
