# [S] Cycle breaking — weighted greedy feedback arc set
<!-- labels: lane:graph,size:M -->
**What**

`src/graph/acyclic.ts` — repeatedly find SCCs, and in each one remove the lowest-weight internal edge until the graph is acyclic. Weights are in `docs/03-graph-scheduling.md#cycle-detection-and-breaking`: human-asserted edges are immutable, sub-issue hierarchy near-immutable, explicit author text high, soft ordering preferences cheapest to cut.

End with a **hard assertion**: run Kahn's algorithm and throw if the graph is still cyclic.

**Why it matters**

Topological scheduling is undefined on a cyclic graph, so this is load-bearing rather than polish. Build it early, not in the last hour.

Two things it must not do:

- **Never silently drop an edge.** Every break produces a `CycleBreak` record with the cycle path, the chosen victim, and up to three alternatives, so a human can pick differently in the UI.
- **Never guess when every edge in a cycle is human-asserted.** Emit `reason: 'unresolvable_requires_human'` and escalate.

That second case is the best human-checkpoint moment in the entire project: the machine found a contradiction it could not resolve alone and asked. Don't automate it away.

Minimum feedback arc set is NP-hard; this is a greedy heuristic and the README says so plainly.

**Scope**

- `src/graph/acyclic.ts`

**Done when**

- [ ] A planted three-node cycle is broken at the lowest-weight edge
- [ ] The Kahn invariant assertion throws on a still-cyclic graph
- [ ] All-human cycles report `unresolvable_requires_human` with no victim chosen
- [ ] Every break carries alternatives for the UI

**Depends on:** Tarjan SCC in #17.
