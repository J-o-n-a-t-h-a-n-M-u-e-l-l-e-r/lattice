# [U] ~~Wire approvals to the write-back path~~ (superseded)
<!-- labels: lane:ui,size:M -->
**This issue is obsolete. Do not implement it.**

There are no approvals to wire. The pipeline applies edges to GitHub itself at the end of every run — see **#7** (write-back and pruning) and **#46** (automatic triggers).

The UI does not write to GitHub at all. It reads the store.
