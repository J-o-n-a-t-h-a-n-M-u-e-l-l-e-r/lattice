# [S] Tarjan strongly-connected components
<!-- labels: lane:graph,size:S -->
**What**

`src/graph/scc.ts` — Tarjan's algorithm over the edge list, returning strongly-connected components. Components of size > 1 are cycles.

Also `shortestCycleThrough(edges, component)` — given an SCC, return an actual cycle path like `12 → 19 → 23 → 12` for display.

**Why it matters**

Everything downstream is undefined on a cyclic graph, so this is where the DAG guarantee starts. It also feeds the UI directly: the cycle-resolution screen needs a *readable* cycle path, not just "these five issues are tangled".

The iterative form is worth the extra fifteen lines — a recursive Tarjan will blow the stack on a pathological graph, and we'd rather not find that out on stage.

**Scope**

- `src/graph/scc.ts`

**Done when**

- [ ] Correct SCCs on a hand-built fixture with two separate cycles
- [ ] `shortestCycleThrough` returns a real traversable path
- [ ] Pure — no I/O, no `process.env`
- [ ] Unit-tested

**Depends on:** the types contract in #1 for the edge shape. Nothing else — this module is completely standalone.
