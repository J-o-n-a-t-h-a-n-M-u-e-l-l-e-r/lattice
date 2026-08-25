# [S] Conflict-risk scoring between issues
<!-- labels: lane:graph,size:S -->
**What**

`conflict(a, b)` = IDF-weighted Jaccard of the file paths and symbols extracted from each issue. Reuses the inverted index built for candidate generation rather than recomputing anything.

**Why it matters**

This is the bridge between the graph work and the agent-dispatch work, and it's about fifteen lines.

Two issues can be genuinely independent in the dependency graph and still be unsafe to hand to two agents at once, because they'd edit the same file and produce a merge conflict. Dependency order and edit-collision are **different axes**, and only the first is visible in the graph.

The dispatcher uses this to refuse to send colliding issues in the same wave, and shows the deferral out loud: *"Deferred #14 — 0.62 file overlap with #12 (`src/graph/schedule.ts`)"*. That's a problem which only exists when your teammates are agents — two humans would have talked to each other — which makes it a strong demo beat.

**Scope**

- `src/graph/schedule.ts` (or a small sibling module)

**Done when**

- [ ] Reuses the index from the inference layer rather than duplicating extraction
- [ ] Returns a 0–1 score with the shared tokens listed, so deferrals can be explained
- [ ] Exposed to the dispatch layer and to `list_ready_work`

**Depends on:** the path and symbol inverted index in #11.
