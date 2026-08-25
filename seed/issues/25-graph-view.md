# [U] The interactive graph — the centrepiece
<!-- labels: lane:ui,size:L -->
**What**

A genuinely good interactive dependency graph. `@xyflow/react` with dagre layout, `rankdir: 'LR'`, rank = wave index.

- **Wave columns with headers** — "Wave 0 · ready now (5)". This is what makes it read as a *schedule* rather than a hairball; a stranger should get the picture in three seconds with no narration.
- **Node encoding** — fill by state (done / in progress / ready / blocked), thick border for the critical path, a pill showing blast radius, the issue number and title.
- **Edge encoding** — style by dependency type, opacity by confidence, and a visibly distinct treatment for non-blocking edges (below threshold or `ordering_preference`).
- **Interaction** — pan, zoom, fit-to-view, hover to highlight a node's full upstream and downstream, click to open the detail panel (#26), and a control to toggle transitive reduction on and off.
- **Click through to GitHub** — every node and every issue reference links to the real issue.

**Why it matters**

This is the product, the 0:55 demo beat, and the screenshot in the README. Everything else in the project is machinery that exists to make this screen correct.

The graph is the *only* place the dependency information exists — Lattice never writes to GitHub — so "you can see it and click into it" is not a nice-to-have, it's the whole delivery mechanism. Budget real time for polish here.

**Two implementation notes:**

- **Transitive reduction is a rendering choice made here**, not in the store or the scheduler. If A→B, B→C and A→C, hiding A→C declutters the picture — but the edge still exists, still has its own rationale and evidence, and must remain clickable when the toggle is off. Never render the reduced graph as if it were the graph.
- **Don't write a layout engine.** dagre feeding React Flow is about thirty lines. If its edge routing looks bad, elkjs swaps in behind the same `nodes + edges → positions` interface — twenty minutes, not a rewrite.

**Scope**

- `app/page.tsx`, `app/components/graph/**`

**Done when**

- [ ] Waves render as labelled left-to-right columns
- [ ] The critical path is obvious without explanation
- [ ] Edge styling distinguishes type, confidence and blocking vs non-blocking
- [ ] Hover highlights the full upstream/downstream of a node
- [ ] Transitive reduction toggles without a refetch
- [ ] Every node links to its GitHub issue
- [ ] Renders the committed fixture with no database running
- [ ] Readable at 45 nodes without panning, and usable at 200

**Depends on:** the app shell in #24, the fixture in #4, and the serialised payload from #51.
