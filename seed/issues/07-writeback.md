# [G] ~~Automatic `blocked_by` write-back~~ (superseded)
<!-- labels: lane:github-io,size:M -->
**This issue is obsolete. Do not implement it.**

**Lattice does not write to GitHub.** Issues are a data source, not a data store.

The graph — every edge, with type, confidence, evidence and provenance — lives in the store (#3). Nothing is pushed back: no dependency writes, no comments, no labels.

That constraint is what makes an unsupervised system safe to run. There are no write permissions to request, no secondary rate limit to work around, and no automatic writer that could corrupt a shared repo or delete a dependency someone recorded by hand. The worst a bad inference can do is mis-order our own suggestions until the next run.

Data flows toward GitHub in exactly one direction: **a human edits `blocked_by`, and the next run reads it as immutable ground truth** the model may not contradict. See #6.
