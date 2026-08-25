# [U] Human nudges — pin and suppress
<!-- labels: lane:ui,size:S -->
**What**

Two row actions on an edge:

- **Pin** — a human asserts this edge. Never pruned, never cut during cycle breaking, treated as `IMMUTABLE`.
- **Suppress** — a human rejects it. Never proposed again, never written.

Both are single boolean columns already present in the schema (#3).

**Why it matters**

**Low priority. Do this last, or not at all.**

It is the entire human-control story, and it is deliberately tiny: humans influence the graph by **correcting it after the fact**, not by standing in front of it. That's the difference between a system that runs and one that waits.

Worth knowing: there is already a zero-UI nudge path that costs nothing. Editing `blocked_by` directly on GitHub is picked up as a `given` edge on the next run, and `given` edges are immutable and never pruned. So a human who wants to overrule Lattice can already do it in the GitHub UI today. This issue just makes it convenient.

That's also the honest framing for a judge asking where the human is: control without a bottleneck.

**Scope**

- Row actions in `/runs` and the graph node panel, store mutations

**Done when**

- [ ] Pinned edges survive pruning and are never cut in a cycle
- [ ] Suppressed edges are never re-proposed or written
- [ ] Both are visible in the UI as a distinct state
- [ ] Neither blocks a run from completing

**Depends on:** the store in #3 and the runs UI in #49. Nothing depends on this.
