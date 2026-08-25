# [I] Candidate pair generation and clustering (optional)
<!-- labels: lane:inference,size:L -->
**What**

Build the candidate set from the union of: bare cross-reference pairs, same-milestone pairs (capped 40 per milestone), same `area:*` label pairs (capped 40), top-6 embedding neighbours per issue, path/symbol overlap pairs above 0.25, and all pairs inside a sub-issue tree. Dedupe, cap at 6n.

Then build the undirected candidate graph weighted by how many signals fired, partition it with greedy modularity or connected components, and split any component larger than 14 issues.

Two refinements that matter: each issue joins its **top 2** clusters, so cluster boundaries get double coverage; and a final **representatives cluster** takes the 2 highest-degree issues from each cluster (capped at 14) to catch genuine cross-cluster edges.

> **Optional — stretch work.** Off by default; only build this if the single-call path measurably underperforms on the gold set.

**⚠️ Scope change since this was written:** we now use `stealth/ox-alpha` with a **1M-token context**, so clustering is no longer needed for *capacity* at our scale — 45 issues is roughly 30k tokens. It is still needed for *precision*, because a model asked about 45 issues at once attends worse than one asked about 12.

So: make cluster size configurable via `LATTICE_CLUSTER_SIZE`, where `0` means one call for the whole backlog, and **default to a single call for n ≤ 40**. Then measure both paths against the gold set in #42 and report which wins. That comparison costs one extra run and is a genuinely interesting result.

**Why it matters**

This is the answer to the O(n²) problem for large backlogs, and the reason the project scales past a toy. Never ask the model about all pairs; never ask about a single pair either, since N² calls is the same problem wearing a hat. Ask about clusters.

Target: n=30 → ~5 requests. n=200 → ~32 requests at concurrency 5, roughly 50 seconds. Put these measured numbers in the README — scale claims backed by numbers are rare in hackathon submissions.

Note that **requests, not dollars, are the scarce resource**: the model is free, but OpenRouter's free tier allows 20/min and 50/day (1000/day with $10 of credits).

**Scope**

- `src/lib/infer/candidates.ts`

**Done when**

- [ ] Candidate count stays at or below 6n
- [ ] No cluster exceeds 14 issues
- [ ] Every issue appears in at least one cluster
- [ ] The representatives cluster exists and is capped
- [ ] Call count is reported

**Depends on:** the symbol index in #11 for overlap-based candidates, and ingested issues from #5. Nothing depends on this.
