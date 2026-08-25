# [C] Conflict-free wave selection with visible deferrals
<!-- labels: lane:mcp,size:M -->
**What**

Given wave 0, greedily select a dispatch set: take the highest blast-radius issue, then add each next one only if its conflict risk against every already-selected issue is below 0.4. Render the deferrals explicitly in the UI:

> Deferred #14 — 0.62 file overlap with #12 (`src/graph/schedule.ts`)

**Why it matters**

Dependency order and edit-collision are different axes. Two issues can be perfectly independent in the graph and still be a terrible idea to hand to two agents simultaneously, because they'd both edit the same file.

This is worth thirty seconds of demo on its own because **it's a problem that only exists when your teammates are agents.** Two humans would have mentioned it to each other over coffee. Agents won't, so the scheduler has to.

Showing the deferral rather than silently dropping the issue is the point — it demonstrates the system reasoning about parallelism rather than just executing a list.

**Scope**

- `app/api/dispatch/route.ts`, dispatch panel in `app/page.tsx`

**Done when**

- [ ] Colliding issues are never dispatched together
- [ ] Every deferral names the other issue and the shared files
- [ ] The threshold is configurable
- [ ] Deferred issues are offered again once the conflict clears

**Depends on:** conflict-risk scoring in #23 and the dispatch path in #37.
