# [S] ~~Conflict-risk scoring between issues~~ (superseded)
<!-- labels: lane:graph,size:S -->
**This issue is obsolete. Do not implement it.**

The idea was an IDF-weighted similarity score over file paths and symbols mentioned in issues, used to stop two agents being handed work that would touch the same files.

**Cut. The graph already answers this deterministically.** Wave 0 is, by construction, a set of issues with no unmet blockers and no dependency between them — that *is* the parallel-safe set, computed exactly, from a graph we can explain edge by edge.

Layering a fuzzy text-similarity heuristic on top of an exact result only adds a way to be wrong: it would defer work that was genuinely safe, and it would still miss collisions between files no issue happens to mention. Determinism is the product.

The scope hint an agent needs is already in its briefing (#39), which lists the files that issue is expected to touch.
