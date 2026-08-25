# [M] `scripts/agent.ts` — local MCP client
<!-- labels: lane:mcp,size:S -->
**What**

A real MCP client that connects to our server, calls `claim_next_issue`, prints the briefing, waits a beat, and calls `report_progress`. Runs in about three seconds.

**Why it matters**

Two jobs, both important:

1. **It's how the MCP server gets tested.** Manual inspector clicking doesn't exercise the lease logic under concurrency; running two of these at once does.
2. **It demonstrates the loop.** This proves agent coordination end to end against the same server and tools in three seconds.

Build it early rather than late. Like several of our fallbacks, it costs nothing extra because we need it for development anyway.

Support `--agents N` to run several concurrently — that's both the lease test and a nice visual of parallel claiming.

**Scope**

- `scripts/agent.ts`

**Done when**

- [ ] Completes a full claim → briefing → report cycle
- [ ] `--agents 3` runs concurrently without two agents claiming the same issue
- [ ] Output is legible enough to show on stage

**Depends on:** leases and claiming in #32, and progress reporting in #33.
