# [M] Agent leases and `claim_next_issue`
<!-- labels: lane:mcp,size:M -->
**What**

`claim_next_issue({ agent_id, lease_minutes, area })` — atomically claim the highest-ranked unclaimed ready issue, returning the issue, a lease expiry, a suggested base ref, and a **briefing** telling the agent what it's unblocking and which files other agents currently hold.

Leases live in `.lattice/leases.json` with a TTL; expired leases are reclaimed on read. Optionally mirror the claim to GitHub as a `lattice:claimed-by-<agent>` label.

**Why it matters**

**This is the tool that makes Lattice a scheduler rather than a report**, and it is the most direct answer to the hackathon's question. It is literally the protocol by which human and non-human teammates avoid stepping on each other: five agents pulling from the same backlog need something to arbitrate, and this is it.

Atomicity is the whole point — two agents calling simultaneously must not receive the same issue. Write to a temp file and rename.

The briefing string is where the graph earns its keep: "you are unblocking #19 and #23; agent-b holds `src/graph/scc.ts`" is knowledge the agent would otherwise have to rediscover, or more likely, not discover at all.

**Scope**

- `src/lib/mcp/tools/claim.ts`, lease handling in `src/lib/store.ts`

**Done when**

- [ ] Concurrent claims never return the same issue
- [ ] Expired leases are reclaimed
- [ ] The briefing names both dependents and conflicting agents
- [ ] `exclude_claimed` in `list_ready_work` respects live leases

**Depends on:** the read tools in #31 for ranking, and the store helpers in #3 for persistence.
