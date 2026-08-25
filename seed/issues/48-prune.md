# [G] Prune stale Lattice-authored edges
<!-- labels: lane:github-io,size:S -->
**What**

At the end of each run, remove `blocked_by` edges that **we** wrote (`authored_by = 'lattice'`) and no longer infer. Never touch a `given` edge.

`DELETE /repos/{o}/{r}/issues/{n}/dependencies/blocked_by/{issue_id}`, same rate-limit discipline as writes.

**Why it matters**

Writes are automatic and continuous, so an add-only writer accretes garbage forever. An issue reworded in week two shouldn't keep a dependency that the current pipeline no longer believes in.

**This is also the most dangerous operation in the codebase.** Deleting a dependency a human deliberately recorded is the single worst thing this tool could do — worse than a wrong inference, because it destroys someone else's work silently. The `authored_by` distinction is the only thing preventing it, so treat that check as safety-critical and test it explicitly.

Consider a grace period: prune only edges absent from two consecutive runs, so a single flaky model call doesn't churn the graph.

**Scope**

- `src/lib/github/write.ts`

**Done when**

- [ ] Stale Lattice-authored edges are removed
- [ ] A `given` edge is never deleted, proven by an explicit test
- [ ] A dry-run lists deletions before any are made
- [ ] Deletions are rate-limited and recorded on the run
- [ ] Grace period (or a documented decision not to have one)

**Depends on:** write-back in #7 and `authored_by` from the store in #3.
