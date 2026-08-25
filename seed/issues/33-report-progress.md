# [M] `report_progress` and the graph delta
<!-- labels: lane:mcp,size:M -->
**What**

`report_progress({ agent_id, number, status, pr_url, branch, note })` where status is one of started / pr_opened / blocked / done / abandoned. It recomputes the schedule and returns a `graph_delta`: `newly_ready`, `critical_path_changed`, `remaining_days`, plus an optional next suggestion.

**Why it matters**

`newly_ready` is the closing beat of the demo. The agent finishes a task and is immediately told what it just unlocked — that is what turns a static graph into a control loop rather than a report.

It's also what makes the whole system feel alive on screen: a node turns green, two more turn white, and the wave columns reflow. Fifteen seconds of demo that requires no narration.

`abandoned` matters more than it looks — an agent that gives up must release its lease, or that issue is invisible to everyone until the TTL expires.

**Scope**

- `src/lib/mcp/tools/progress.ts`

**Done when**

- [ ] Each status transitions state correctly and releases leases where appropriate
- [ ] `newly_ready` is computed correctly after a completion
- [ ] The UI reflects the change on its next read
- [ ] `blocked` prompts the agent toward `propose_dependency`

**Depends on:** leases in #32, and the wave recomputation in #19.
