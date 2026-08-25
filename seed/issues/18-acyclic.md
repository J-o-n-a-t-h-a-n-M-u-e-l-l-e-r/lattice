# [S] Automatic cycle breaking — weighted greedy feedback arc set
<!-- labels: lane:graph,size:M -->
**What**

`src/graph/acyclic.ts` — repeatedly find SCCs and remove the lowest-weight internal edge until the graph is acyclic. Weights are in `docs/03-graph-scheduling.md`: `given` and `pinned` edges are `IMMUTABLE`, sub-issue hierarchy near-immutable, soft ordering preferences cheapest to cut, everything else by confidence.

End with a **hard assertion**: run Kahn's algorithm and throw if the graph is still cyclic.

**Why it matters**

Topological scheduling is undefined on a cyclic graph, and there is no human to ask, so this has to resolve every cycle on its own, every run, unsupervised. Build it early — it is load-bearing, not polish.

Two things make unsupervised cutting safe, and both must hold:

- **`given` and `pinned` edges are immutable**, so the algorithm can only ever cut something the model inferred. Worst case we mis-order our own suggestions and the next run corrects it.
- **If every edge in a cycle is immutable**, do not guess. Drop the component from the *scheduling* graph, flag `unresolvable_given_cycle`, and leave GitHub untouched.

Every break is still recorded — the cycle path, the victim, the top three alternatives — but that record is for explaining afterwards in `/runs`, not for approving beforehand.

Minimum feedback arc set is NP-hard; this is a greedy heuristic and the README says so.

**Scope**

- `src/graph/acyclic.ts`

**Done when**

- [ ] A planted three-node cycle is broken at the lowest-weight edge, automatically
- [ ] A `given` edge is never cut, proven by a test
- [ ] All-immutable cycles report `unresolvable_given_cycle`, cut nothing, and are excluded from scheduling
- [ ] The Kahn invariant assertion throws on a still-cyclic graph
- [ ] Every break records cycle, victim and alternatives

**Depends on:** Tarjan SCC in #17.
