# [G] Automatic `blocked_by` write-back, with pruning
<!-- labels: lane:github-io,size:M -->
**What**

At the end of every run, reconcile GitHub's native dependencies with what the pipeline currently infers. Three sets:

- **Add** — inferred edges at or above `LATTICE_WRITE_THRESHOLD` (default 0.80) that GitHub doesn't have yet
- **Prune** (#48) — edges *we* previously wrote (`authored_by = 'lattice'`) that are no longer inferred
- **Never touch** — `given` edges, whoever created them

Full shape in `docs/09-github-api-notes.md#write-path-shape`.

**Why it matters**

This is the money shot of the demo — the moment GitHub itself becomes the source of truth and the project stops being a side database. **Nobody approves it**; the run applies it.

That makes the failure modes matter more than they used to:

- The body is `{ "issue_id": <databaseId> }`. **Not the `#number`.**
- The endpoint has a *secondary* rate limit, invisible in `X-RateLimit-Remaining`. Space writes ~1.2s apart and back off on 403/429.
- A 422 usually means GitHub detected a cycle against edges already in the repo. Record `github_rejected_cycle` and **continue the batch**.
- **Pruning is not optional.** An automatic writer that only ever adds accretes stale edges forever. But prune only what we authored — deleting a dependency a human recorded is the single worst thing this tool could do.

**Scope**

- `src/lib/github/write.ts`

**Done when**

- [ ] Running twice creates no duplicates and makes no redundant calls
- [ ] Edges below the threshold are never written
- [ ] Stale Lattice-authored edges are removed
- [ ] A `given` edge is never modified or deleted, proven by a test
- [ ] 403/429 backs off; 422 is recorded and the batch continues
- [ ] Uses `databaseId`, verified against a real issue
- [ ] `LATTICE_WRITE_THRESHOLD=1.0` results in zero writes

**Depends on:** the types contract in #1, existing-dependency reads in #6, and `authored_by` from the store in #3.
