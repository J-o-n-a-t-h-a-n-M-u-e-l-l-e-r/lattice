# [F] Hand-write `analysis.fixture.json`
<!-- labels: lane:foundation,size:S -->
**What**

A realistic, hand-authored `.lattice/analysis.fixture.json`: roughly 20 issues, ~15 edges spanning all four dependency types, a spread of confidence values from 0.3 to 0.98, at least one contested pair, and **one deliberate cycle** so the cycle-resolution UI has something to render.

Commit it. It is not throwaway.

**Why it matters**

This is the single most important scheduling decision in the whole plan. The UI and MCP workstreams build against this fixture from hour one and **never wait for the inference pipeline**. Without it, two of five people sit idle for half a day.

It is also the backing data for `DEMO_MODE=1`, which is what lets a judge with no API tokens see the entire app — a directly scored criterion.

**Scope**

- `.lattice/analysis.fixture.json`

**Done when**

- [ ] Validates against the `Analysis` type from #1
- [ ] Contains all four `DependencyType` values
- [ ] Contains a cycle of at least three issues
- [ ] Every edge has a plausible `rationale` and a verbatim-looking `evidence` quote
- [ ] The UI renders it without special-casing

**Depends on:** the shared types contract in #1. Nothing else — that's the point of it.
