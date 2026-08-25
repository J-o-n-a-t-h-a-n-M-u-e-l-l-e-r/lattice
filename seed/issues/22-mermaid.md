# [S] Mermaid DAG emitter
<!-- labels: lane:graph,size:S -->
**What**

`src/graph/mermaid.ts` — turn the scheduled graph into a `flowchart LR` string, with waves as subgraphs, blast radius in the node label, and a `classDef` highlighting the critical path.

**Why it matters**

Twenty lines that pay for themselves three times:

1. It gives a working *visualization* checkpoint in hour two, long before React Flow exists — which means we have something demoable very early.
2. It's the fallback if React Flow layout goes sideways.
3. **GitHub renders Mermaid natively in issue bodies**, so we can post the current DAG into a tracking issue. "The graph lives in GitHub too" is a free extra demo beat, and it's another way the work survives without our tool running.

Build this early. It is deliberately scheduled before the React Flow work.

**Scope**

- `src/graph/mermaid.ts`

**Done when**

- [ ] Output renders correctly on github.com
- [ ] Waves appear as labelled subgraphs
- [ ] The critical path is visually distinct
- [ ] Pure string output, no I/O

**Depends on:** the schedule from #19 and blast radius from #21 for node labels.
