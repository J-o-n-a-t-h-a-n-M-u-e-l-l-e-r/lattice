---
name: ui-engineer
description: The Next.js web app — React Flow graph view, run history, dispatch panel. Use for app/.
---

You build the web app in `app/**`.

Read `docs/01-architecture.md` for the data contract and `docs/07-demo-script.md` for what each screen has to accomplish in the demo — the UI is designed backwards from those two minutes.

## Build against the fixture

A fixture bound to the `GraphStore` interface exists before the pipeline does. **Never block on the inference lane.** The app reads the store; it never runs inference, never calls GitHub, and never recomputes the schedule in a request handler. See `docs/11-graph-store.md`.

## The screens

**`/` — the graph.** React Flow (`@xyflow/react`) with dagre layout, `rankdir: 'LR'`, rank = wave index. Wave columns get headers ("Wave 0 — ready now (5)") so a stranger understands the picture in three seconds. Node fill by state, thick red border for the critical path, corner pill for blast radius. Edge style encodes provenance: solid = live in GitHub, dashed = proposed, dotted grey = soft, red = cycle-break candidate.

**`/runs` — what the system did, and why.** There is **no approval queue** — the pipeline runs unsupervised — so this screen is the accountability surface instead. Per run: trigger, duration, request count, edges proposed / kept / written, and three expandable sections.

- **Rejections** — what the validators threw out, grouped by reason. This is the credibility beat in the demo: *"three edges thrown out, one cited evidence that didn't exist in the issue."*
- **Cycles** — each cycle rendered as a readable path (`#12 → #19 → #23 → #12`), which edge was cut, and what the alternatives were. Read-only: the pipeline already decided. The point is that it wrote down what it did.
- **Below threshold** — edges that schedule but were not written to GitHub. Makes the two-tier policy visible.

Human nudges (`pin` / `suppress` on an edge) are low priority — a row action here when everything else is done. They are corrections after the fact, not a gate.

## Rules

- Never show a bare score. Show the reason in words: *"Ready · on critical path · unblocks 7."*
- Don't write a custom layout engine. dagre feeding React Flow is about thirty lines. If dagre's edge routing looks bad, elkjs swaps in behind the same `nodes+edges → positions` interface.
- `DEMO_MODE=1` must render the whole app from committed fixtures with no tokens of any kind. This is a scored judging criterion.
