# [I] Candidate pair generation and clustering
<!-- labels: lane:inference,size:L -->
**What**

Build the candidate set from the union of: bare cross-reference pairs, same-milestone pairs (capped 40 per milestone), same `area:*` label pairs (capped 40), top-6 embedding neighbours per issue, path/symbol overlap pairs above 0.25, and all pairs inside a sub-issue tree. Dedupe, cap at 6n.

Then build the undirected candidate graph weighted by how many signals fired, partition it with greedy modularity or connected components, and split any component larger than 14 issues.

Two refinements that matter: each issue joins its **top 2** clusters, so cluster boundaries get double coverage; and a final **representatives cluster** takes the 2 highest-degree issues from each cluster (capped at 14) to catch genuine cross-cluster edges.

**Why it matters**

This is the answer to the O(n²) problem, and the reason the project scales past a toy. Never ask the model about all pairs; never ask about a single pair either, since N² calls is the same problem wearing a hat. Ask about clusters.

Target cost: n=30 → ~5 LLM calls. n=200 → ~32 calls at concurrency 5, roughly 50 seconds. Put these measured numbers in the README — scale claims backed by numbers are rare in hackathon submissions.

**Scope**

- `src/lib/infer/candidates.ts`

**Done when**

- [ ] Candidate count stays at or below 6n
- [ ] No cluster exceeds 14 issues
- [ ] Every issue appears in at least one cluster
- [ ] The representatives cluster exists and is capped
- [ ] Call count is reported

**Depends on:** the symbol index in #11 for overlap-based candidates, and ingested issues from #5.
