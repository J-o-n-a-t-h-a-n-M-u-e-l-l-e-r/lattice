# [S] Blast radius via bitset reachability
<!-- labels: lane:graph,size:S -->
**What**

The size of the transitive set an issue unblocks. Reverse-topological DP with `Uint32Array` bitsets — exact, and instant below ~2000 nodes. Implementation sketch is in `docs/03-graph-scheduling.md#blast-radius`.

**Why it matters**

Blast radius is the primary ranking signal for "what should I work on next". An issue that unblocks nine others beats one that unblocks none, even when both are ready — and that's a genuinely non-obvious answer that a human staring at a flat list cannot produce.

It's also the number on the node badge in the graph view and the one we say out loud in the demo: *"this one unblocks seven others — do it first."*

Bitsets rather than sets of numbers because we compute this for every node on every re-analysis, and it should be imperceptible.

**Scope**

- `src/graph/schedule.ts`

**Done when**

- [ ] Correct counts on a fixture with a known transitive closure
- [ ] Diamond graphs aren't double-counted
- [ ] Exposed per-node for the UI and the MCP layer

**Depends on:** the topological order from #19.
