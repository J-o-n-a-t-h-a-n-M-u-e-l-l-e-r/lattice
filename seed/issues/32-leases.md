# [M] Agent leases and `claim_next_issue`
<!-- labels: lane:mcp,size:M -->
**What**

`claim_next_issue({ agent_id, lease_minutes, area })` — atomically claim the highest-ranked unclaimed ready issue, returning the issue, a lease expiry, a suggested base ref, and a **briefing** naming what it unblocks and which files other agents currently hold.

Leases live in the store with a TTL; expired leases are reclaimed on read.

**Why it matters**

**This is the tool that makes Lattice a scheduler rather than a report**, and it is the most direct answer to the hackathon's question. It is literally the protocol by which human and non-human teammates avoid stepping on each other: five agents pulling from one backlog need an arbiter, and this is it.

Atomicity is the whole point — two agents calling simultaneously must not receive the same issue. Use a transaction with `SELECT ... FOR UPDATE SKIP LOCKED`, not a read-then-write.

The briefing is where the graph earns its keep: *"you are unblocking #19 and #23; agent-b holds `src/graph/scc.ts`"* is knowledge the agent would otherwise have to rediscover, or more likely never discover.

Optionally mirror the claim to GitHub with a `lattice:claimed-by-<agent>` label. Free, and visible in the demo.

**Scope**

- `src/lib/mcp/tools/claim.ts`, lease handling in `src/store/`

**Done when**

- [ ] Concurrent claims never return the same issue, proven under load
- [ ] Expired leases are reclaimed
- [ ] The briefing names dependents and conflicting agents
- [ ] `exclude_claimed` in `list_ready_work` respects live leases

**Depends on:** the read tools in #31 for ranking, and the store in #3.
