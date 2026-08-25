# [G] `--dry-run` for Copilot dispatch
<!-- labels: lane:github-io,size:S -->
**What**

A `--dry-run` flag that prints the full GraphQL mutation Copilot dispatch *would* send — bot id, `targetRepositoryId`, `baseRef`, and the complete generated `customInstructions` — without sending it.

> **Rescoped.** This originally covered dependency write-back too. Lattice no longer writes to GitHub at all (#7), so assigning Copilot to an issue is the only write in the entire project — and the only thing left to dry-run.

**Why it matters**

Two jobs:

1. **Development.** Nobody should be assigning agents to real issues by accident while iterating on the briefing generator.
2. **Demo fallback.** If Copilot is queued or rate-limited on the day, rendering the exact payload in the UI still shows judges the mechanism — the graph-derived briefing is the interesting part, and it's fully visible without the bot ever running.

**Scope**

- `src/lib/github/copilot.ts`, `app/api/dispatch/route.ts`

**Done when**

- [ ] No mutation escapes when the flag is set
- [ ] Output includes the full `customInstructions`, readable enough to show on stage
- [ ] Reachable from the dispatch panel, not just the CLI

**Depends on:** Copilot dispatch in #37 and the briefing generator in #39.
