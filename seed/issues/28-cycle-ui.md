# [U] ~~Cycle resolution UI~~ (superseded)
<!-- labels: lane:ui,size:M -->
**This issue is obsolete. Do not implement it.**

The original plan asked a human to choose which link to cut when the pipeline found a dependency cycle.

**Cut — cycle breaking is fully automatic.** See #18 and `docs/03-graph-scheduling.md`.

It is safe to automate because of the weighting: `given` edges (already recorded in GitHub) and `pinned` edges are immutable, so the algorithm can only ever cut something the model inferred. The worst case is that we mis-order our own suggestions and the next run corrects it.

Cycles where *every* edge is `given` are not guessed at — the component is excluded from scheduling and flagged `unresolvable_given_cycle`.

Every break is still recorded with the cycle path, the victim and the alternatives. Displaying that record is part of **#49** (`/runs`) — read-only, after the fact.
