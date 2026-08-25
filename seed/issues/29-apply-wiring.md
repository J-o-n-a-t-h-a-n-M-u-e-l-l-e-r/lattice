# [U] ~~Wire approvals to the write-back path~~ (superseded)
<!-- labels: lane:ui,size:M -->
**This issue is obsolete. Do not implement it.**

There are no approvals to wire, and there is nothing to apply: **Lattice never writes to GitHub** (see **#7**). The pipeline ends by persisting the graph to the store (#3). Historic note: this issue predates that decision — see **#46** (write-back and pruning) and **#46** (automatic triggers).

The UI does not write to GitHub at all. It reads the store.
