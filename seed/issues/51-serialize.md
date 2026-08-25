# [S] Serialise the graph for the UI
<!-- labels: lane:graph,size:S -->
**What**

`src/graph/serialize.ts` — turn the scheduled graph into exactly the payload the graph view consumes. Nodes with wave, state, effort, blast radius, critical-path flag, labels and issue URL. Edges with type, confidence, source, blocking flag, rationale and evidence.

**Why it matters**

The UI should receive a payload and lay it out — never join, filter, or recompute. Waves and blast radius are computed once per run and read constantly; recomputing them in a component is how a graph that felt instant at 20 nodes becomes sluggish at 200.

**Send the full graph.** Transitive reduction is a rendering choice made in the view, with a toggle (#25). The scheduler and the store never see a reduced graph, because the reduction is lossy — a redundant-looking edge still carries its own rationale, evidence and provenance, and the panel must be able to show them.

**Scope**

- `src/graph/serialize.ts`

**Done when**

- [ ] Payload contains everything needed to draw a node and its panel, with no further lookups
- [ ] Full edge set, with `blocking` marked rather than filtered
- [ ] Pure — no I/O
- [ ] Stable ordering, so renders don't jitter between runs

**Depends on:** the schedule computations in #19, #20 and #21.
