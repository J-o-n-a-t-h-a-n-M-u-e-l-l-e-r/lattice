# [C] Briefing generator for `customInstructions`
<!-- labels: lane:mcp,size:M -->
**What**

Generate the per-assignment `customInstructions` string from the graph: what this issue blocks and its blast radius, which exported names dependents rely on, whether it's on the critical path, which files other agents currently hold, the expected file surface, and the instruction to call `report_progress` and `propose_dependency` rather than working around a blocker.

Template is in `docs/05-copilot-dispatch.md#custominstructions--the-biggest-lever`.

**Why it matters**

This is the difference between "agentic depth" and "AI bolted on", and it's the amortisation argument made concrete. Every line of the briefing is derived from the graph — the agent receives ordering knowledge it would otherwise have to re-derive with an expensive triage pass, or more likely, never derive at all.

The single highest-value line is naming the exported types that dependents consume. An agent that renames `EdgeCandidate` because it prefers a different name breaks four issues that haven't started yet, and nothing in a normal issue body would have warned it.

**Scope**

- `src/lib/github/copilot.ts`

**Done when**

- [ ] Briefing names dependents, blast radius, and critical-path status
- [ ] It names files held by other in-flight agents
- [ ] It instructs the agent to use the MCP tools rather than improvising
- [ ] It is visible in the dispatch dry-run output

**Depends on:** the dispatch path in #37, blast radius from #21, and live lease state from #32.
