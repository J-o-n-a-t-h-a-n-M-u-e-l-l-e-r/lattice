# [M] MCP read tools — ready work, context, explain
<!-- labels: lane:mcp,size:L -->
**What**

Three tools, with signatures in `docs/04-mcp-surface.md`:

- `list_ready_work({ limit, area, exclude_claimed })` — unblocked issues ranked by blast radius, each with `unblocks`, `conflict_risk`, and a `reason`
- `get_issue_context({ number })` — blockers with state, dependents with *what they need from you*, recommended base ref, likely files
- `explain_dependency({ blocked, blocked_by })` — type, confidence, source, rationale, evidence, approver

**Why it matters**

This is the amortisation argument made concrete: instead of every agent run re-deriving the ordering with an expensive triage pass, one call returns the answer with reasoning attached.

`reason` must be a human sentence — "ready · critical path · unblocks 7" — not a score. The agent can put it straight into a PR description, and a bare number tells nobody anything.

`what_they_need_from_you` in `get_issue_context` is the field that stops an agent renaming an exported type four other issues import. It is worth the effort to populate properly.

**Do not re-export GitHub CRUD.** The official GitHub MCP server already does issue reads. If a tool here could be replaced by a call to that server, it doesn't belong here — ours exposes the derived schedule, which exists nowhere else.

**Scope**

- `app/api/mcp/[transport]/route.ts`, `src/lib/mcp/tools/**`

**Done when**

- [ ] All three tools return schema-valid responses
- [ ] `reason` is a sentence, never a bare score
- [ ] Claude Code answers "what should I work on next" sensibly
- [ ] Ranking matches the documented sort order

**Depends on:** the MCP route in #30, and the schedule computations — waves in #19, critical path in #20, blast radius in #21, conflict risk in #23.
