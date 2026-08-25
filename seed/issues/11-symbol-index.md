# [I] Path and symbol inverted index (optional)
<!-- labels: lane:inference,size:M -->
> **Optional — stretch work.** Only needed if you enable the clustered inference path (#12), which is **off by default**: Ox Alpha's 1M context means the whole backlog fits in a single call. Don't start here.

**What**

Extract file paths (`src/foo/bar.ts`, `packages/x`) and backticked identifiers containing `/` or `.` from every issue's title and body. Build an IDF-weighted inverted index over them, and expose candidate pairs where two issues share a rare token.

**Why it matters**

Purely candidate generation for clustering: two issues that both name `src/graph/schedule.ts` are worth putting in the same cluster even if neither mentions the other.

> **Scope reduced.** This originally justified itself twice — candidate generation *and* an agent conflict-risk score. The conflict-risk half was dropped (#23): the graph already tells us deterministically what can run in parallel, and a fuzzy similarity score on top of an exact answer only adds a way to be wrong.

IDF weighting is what stops `src/` and `.ts` dominating; rare tokens carry the signal.

**Scope**

- `apps/backend/src/infer/candidates.ts`

**Done when**

- [ ] Paths and backticked symbols extracted from title and body
- [ ] IDF weighting demonstrably down-weights common tokens
- [ ] Pure — no I/O

**Depends on:** ingested issues from #5. Nothing depends on this unless clustering is enabled.
