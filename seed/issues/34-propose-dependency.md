# [M] `propose_dependency` into the human review queue
<!-- labels: lane:mcp,size:M -->
**What**

`propose_dependency({ agent_id, blocked, blocked_by, rationale, evidence })` — an agent that discovers an unrecorded blocker queues it for human review, tagged `source: 'agent_reported'`. It lands in the **same** `/review` queue as LLM-inferred edges. Never auto-applied.

`blocked_by` may also be `{ new_issue_title }` for a blocker that doesn't have an issue yet.

**Why it matters**

This is the project's central claim about agentic collaboration, stated as a rule: **an agent may propose a dependency; only a human may commit one.**

It closes the loop that makes the system trustworthy. Without it, an agent hitting an unrecorded blocker has two bad options — work around it silently, producing something that has to be redone, or fail. With it, the graph gets *better* every time an agent runs, and a human stays in control of what the graph asserts.

It's also the answer to the obvious judging question, "what happens when the inference is wrong?" The system learns, through a human.

Do not add a shortcut that writes directly. A convenience path here destroys the submission's thesis.

**Scope**

- `src/lib/mcp/tools/propose.ts`

**Done when**

- [ ] Proposals appear in `/review` marked as agent-reported
- [ ] Nothing reaches GitHub without human approval
- [ ] `new_issue_title` proposals are handled
- [ ] The returned `review_url` actually works

**Depends on:** the MCP route in #30 and the review queue in #27.
