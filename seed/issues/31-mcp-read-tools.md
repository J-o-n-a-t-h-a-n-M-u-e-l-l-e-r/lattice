# [M] MCP read tools — ready work, context, explain
<!-- labels: lane:mcp,size:L -->
**What**

Three tools, signatures in `docs/04-mcp-surface.md`:

- `list_ready_work({ limit, area, exclude_claimed })` — unblocked issues ranked by blast radius, each with `unblocks` and a `reason`
- `get_issue_context({ number })` — blockers with state, dependents with *what they need from you*, recommended base ref, likely files
- `explain_dependency({ blocked, blocked_by })` — type, confidence, source, rationale, evidence, which run first saw it, and whether it is blocking

**Why it matters**

This is the amortisation argument made concrete: instead of every agent run re-deriving the ordering with an expensive triage pass, one call returns the answer with reasoning attached.

**Every read is served from the store.** No MCP tool triggers inference, calls GitHub, or recomputes a topological sort — five agents polling `list_ready_work` should cost five cache hits. See `docs/11-graph-store.md`.

`explain_dependency` carries extra weight now: **it is the only place the reasoning exists.** Lattice never writes to GitHub, so an inferred edge has no representation anywhere else — this tool and the node panel are how anyone, human or agent, checks why an edge is there.

`reason` must be a human sentence — "ready · critical path · unblocks 7" — not a score. The agent can put it straight into a PR description.

**Do not re-export GitHub CRUD.** The official GitHub MCP server already does issue reads. If a tool here could be replaced by a call to that server, it doesn't belong here.

**Scope**

- `apps/backend/src/mcp/tools/**`

**Done when**

- [ ] All three return schema-valid responses read entirely from the store
- [ ] `reason` is a sentence, never a bare score
- [ ] Claude Code answers "what should I work on next" sensibly
- [ ] Ranking matches the documented sort order
- [ ] No tool triggers inference or a GitHub call

**Depends on:** the MCP route in #30, the store in #3, and the schedule computations in #19, #20, #21 and #23.
