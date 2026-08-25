# [I] Path and symbol inverted index
<!-- labels: lane:inference,size:M -->
**What**

Extract file paths (`src/foo/bar.ts`, `packages/x`) and backticked identifiers containing `/` or `.` from every issue's title and body. Build an IDF-weighted inverted index over them.

Expose two things: candidate pairs where issues share a rare token (overlap > 0.25), and an `overlap(a, b)` function returning the IDF-weighted Jaccard similarity.

**Why it matters**

This module earns its keep twice, which is why it's worth building properly:

1. **Candidate generation.** Two issues that both name `src/graph/schedule.ts` are worth asking the model about, even if neither mentions the other.
2. **Agent conflict risk.** The same similarity score tells the dispatcher which ready issues would collide if handed to two agents simultaneously. That's a problem that only exists when your teammates are agents — two humans would have talked to each other — and it's a strong demo beat.

IDF weighting is what stops `src/` and `.ts` from dominating; rare tokens carry the signal.

**Scope**

- `src/lib/infer/candidates.ts`

**Done when**

- [ ] Paths and backticked symbols are extracted from title and body
- [ ] IDF weighting demonstrably down-weights common tokens
- [ ] `overlap(a, b)` is exported for reuse by the dispatch layer
- [ ] Pure — no I/O

**Depends on:** ingested issues from #5.
