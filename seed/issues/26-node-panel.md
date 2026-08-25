# [U] Node detail panel — blockers, dependents, evidence
<!-- labels: lane:ui,size:M -->
**What**

Clicking a node opens a panel showing:

- Title, state, labels, effort, wave, blast radius, and a **link to the issue on GitHub**
- **Blockers** — each with its state, and *why*: dependency type, confidence, rationale, and the verbatim quote from the issue that justifies it
- **Dependents** — each with *what they need from you*
- **Actions** — dispatch to Copilot, and (later, #50) pin or suppress an edge

**Why it matters**

The graph answers *what's the shape*; the panel answers *so what do I do*, and — more importantly — **why should I believe this edge?**

That second question is the credibility beat of the whole project. Because Lattice never writes to GitHub and nothing is human-approved, the evidence trail is the only thing that makes an inferred edge trustworthy. Showing the exact quote that produced an edge, one click from the graph, is what turns "an AI guessed this" into "here's where it got that". It is also the 1:15 demo beat.

Showing dependents with *what they need from you* prevents the most expensive mistake in a parallel codebase: renaming an exported type that four unstarted issues import.

**Scope**

- `app/components/graph/NodePanel.tsx`

**Done when**

- [ ] Blockers and dependents listed with live state
- [ ] Every edge shows rationale, confidence and its verbatim evidence quote
- [ ] Non-blocking (sub-threshold) edges are shown and visibly marked as such
- [ ] The issue link opens the real GitHub issue
- [ ] Works against the fixture

**Depends on:** the graph view in #25.
