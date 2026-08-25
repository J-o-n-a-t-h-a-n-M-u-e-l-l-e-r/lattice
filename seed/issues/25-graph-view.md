# [U] React Flow graph view with wave columns
<!-- labels: lane:ui,size:L -->
**What**

`@xyflow/react` with dagre layout, `rankdir: 'LR'`, rank = wave index. Wave columns get headers — "Wave 0 — ready now (5)". Node fill encodes state (done / in progress / ready / blocked), a thick red border marks the critical path, a corner pill shows blast radius.

Edge style encodes provenance: solid = live in GitHub, dashed = proposed and pending review, dotted grey = soft `ordering_preference`, red = cycle-break candidate.

**Why it matters**

This is the 1:15 mark of the demo and the screenshot that goes in the README. The wave column headers are what make it read as a *schedule* rather than a hairball — a stranger should understand the picture in three seconds without narration.

The provenance-encoded edge styling is quietly important: it makes visible, at a glance, the difference between what a human approved and what a model is still proposing. That distinction is the project's whole argument.

**Do not write a custom layout engine.** dagre feeding React Flow is about thirty lines. If dagre's edge routing looks bad, elkjs swaps in behind the same `nodes+edges → positions` interface — a twenty-minute change, not a rewrite.

**Scope**

- `app/page.tsx`, `app/components/graph/**`

**Done when**

- [ ] Waves render as labelled left-to-right columns
- [ ] Critical path is visually obvious without explanation
- [ ] Edge styles distinguish live / proposed / soft / cycle
- [ ] Pan, zoom, and node selection work
- [ ] Renders the committed fixture with no backend running

**Depends on:** the app shell in #24 and the fixture in #4. Consumes the schedule shape produced by #19, #20 and #21, but builds against the fixture first.
