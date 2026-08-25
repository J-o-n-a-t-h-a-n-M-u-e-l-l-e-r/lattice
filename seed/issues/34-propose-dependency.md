# [M] `report_dependency` — the agent feedback loop
<!-- labels: lane:mcp,size:M -->
**What**

`report_dependency({ agent_id, blocked, blocked_by, rationale, evidence })` — an agent that hits an unrecorded blocker mid-run records it. The edge enters the graph through **the same validators and the same blocking threshold** as model-inferred edges. `source: 'agent_reported'`, confidence 0.9.

Returns whether it was accepted, whether it is blocking, and which issues just became blocked.

**Why it matters**

This is the project's collaboration claim in one tool: **the shared workspace gets more accurate as anyone works in it.**

Without it, an agent hitting an unrecorded blocker has two bad options — work around it silently and produce something that has to be redone, or fail. With it, the next agent to ask "what's ready?" gets a better answer because the previous one did the work.

It is also the answer to the obvious judging question, *"what happens when the inference is wrong?"* The system corrects itself from the one source of evidence better than a model reading titles: an agent that actually tried and hit a wall.

**Do not give this a privileged path.** It goes through `validate.ts` like everything else — evidence must be a real substring, IDs must exist, it must not contradict a `given` edge. An agent asserting an edge is evidence, not authority.

**Scope**

- `src/lib/mcp/tools/report-dependency.ts`

**Done when**

- [ ] Reported edges are validated by the same guards, with no bypass
- [ ] A fabricated evidence quote is rejected and the reason returned
- [ ] Edges below the blocking threshold are stored and shown, but constrain nothing
- [ ] The response reports what became newly blocked
- [ ] It cannot contradict a `given` edge

**Depends on:** the MCP route in #30, the validators in #14, and the store in #3.
