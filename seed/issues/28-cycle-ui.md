# [U] Cycle resolution UI
<!-- labels: lane:ui,size:M -->
**What**

A section pinned to the top of `/review` rendering each detected cycle as a readable path — `#12 → #19 → #23 → #12` — with the algorithm's chosen victim preselected and up to three alternatives as radio buttons. The human picks which link to cut. Affected edges cannot be approved until the cycle is resolved.

Cycles marked `unresolvable_requires_human` (every edge human-asserted) get a distinct treatment: no preselection, and a note explaining that the tool refused to guess.

**Why it matters**

This is the single best human-checkpoint moment in the project. The machine found a contradiction it could not resolve on its own and escalated with options — that is exactly what "agents doing meaningful work with sensible human checkpoints" looks like, and it demos in fifteen seconds.

It's also honest about a real limitation: minimum feedback arc set is NP-hard, our heuristic is greedy, and it can cut the wrong edge. Surfacing that rather than hiding it is what makes the rest of the tool's claims credible.

**Scope**

- `app/components/review/Cycles.tsx`

**Done when**

- [ ] Cycles render as readable paths, not sets
- [ ] Alternatives are selectable and the choice persists
- [ ] Affected edges are gated until resolved
- [ ] `unresolvable_requires_human` is visually distinct

**Depends on:** the review queue in #27, and the `CycleBreak` records produced by #18.
