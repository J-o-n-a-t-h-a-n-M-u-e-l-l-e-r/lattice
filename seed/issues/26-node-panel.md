# [U] Node detail side panel
<!-- labels: lane:ui,size:M -->
**What**

Clicking a node opens a panel: title, body excerpt, blockers with their state, dependents, "unblocks N", and two actions — *Explain dependency* and *Dispatch to Copilot*.

**Why it matters**

The graph answers "what's the shape"; the panel answers "so what do I do". It's where a developer actually decides what to pick up, and it's where the reasoning behind each edge becomes visible without leaving the screen.

Showing dependents with *what they need from you* is the detail that prevents the most expensive mistake in a parallel codebase — renaming an exported type that four other issues import.

**Scope**

- `app/components/graph/NodePanel.tsx`

**Done when**

- [ ] Blockers and dependents are listed with live state
- [ ] Each dependency shows its rationale and evidence on demand
- [ ] The dispatch action is wired (may stub until Copilot dispatch lands)
- [ ] Works against the fixture

**Depends on:** the graph view in #25.
