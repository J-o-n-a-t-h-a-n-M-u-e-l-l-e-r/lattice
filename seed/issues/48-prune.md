# [G] ~~Prune stale Lattice-authored edges~~ (superseded)
<!-- labels: lane:github-io,size:S -->
**This issue is obsolete. Do not implement it.**

Pruning existed because the pipeline used to write dependencies into GitHub, and an add-only writer would accrete stale edges forever.

**Lattice no longer writes to GitHub at all** (#7), so there is nothing to prune. Each run supersedes the previous graph in the store — no reconciliation, no `authored_by` bookkeeping, and no risk of deleting a dependency a human recorded by hand.
