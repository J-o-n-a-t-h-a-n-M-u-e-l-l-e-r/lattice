# [S] Topological waves and the ready set
<!-- labels: lane:graph,size:M -->
**What**

`src/graph/schedule.ts` — Kahn's algorithm grouping nodes by level. `wave(v) = 0` if `v` has no **open** blockers, else `1 + max(wave(blockers))`.

Computed over open issues only, so closed blockers vanish and the graph stays live.

**Why it matters**

Wave 0 is the parallelizable frontier — the answer to "what can we start right now?", which is the question the whole project exists to answer. It drives the graph view's column layout, the `list_ready_work` MCP tool, and the Copilot dispatch selection.

The "open issues only" detail is what makes the tool feel alive rather than static: close an issue, re-run, and things move into wave 0. That's the closing beat of the demo.

**Scope**

- `src/graph/schedule.ts`

**Done when**

- [ ] Correct wave assignment on a known DAG fixture
- [ ] Closed issues are excluded and their dependents advance
- [ ] Wave 0 equals the set of open issues with no open blockers
- [ ] Pure — no I/O

**Depends on:** an acyclic graph from #18. Waves are undefined on a cyclic graph, so this must run after cycle breaking.
