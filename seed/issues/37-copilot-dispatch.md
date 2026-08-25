# [C] Copilot bot lookup and dispatch
<!-- labels: lane:mcp,size:M -->
**What**

`src/lib/github/copilot.ts` — find the `copilot-swe-agent` bot via `suggestedActors(capabilities: [CAN_BE_ASSIGNED])`, cache its id, and assign issues with `replaceActorsForAssignable`, passing `targetRepositoryId`, `baseRef`, and `customInstructions`.

Header: `GraphQL-Features: issues_copilot_assignment_api_support,coding_agent_model_selection`. Needs a **user** token — an installation token will not work.

**Why it matters**

The 1:30 beat of the demo. It's also the proof that the graph isn't just a picture: the schedule directly causes work to start.

Cache the bot id in `raw.json`. It's stable, and a lookup failing live on stage for no good reason would be a needless way to lose thirty seconds.

Concurrency limits are undocumented. Assume they exist and don't dispatch fifteen at once during a demo.

**Scope**

- `src/lib/github/copilot.ts`, `app/api/dispatch/route.ts`

**Done when**

- [ ] Bot id resolves and is cached
- [ ] An issue is successfully assigned and Copilot picks it up
- [ ] `--dry-run` renders the full mutation payload instead of sending
- [ ] Failures report clearly rather than silently no-op'ing

**Depends on:** the ingest in #5 for node ids, and `--dry-run` support from #9.
