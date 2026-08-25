# [C] `baseRef` branch-stacking policy
<!-- labels: lane:mcp,size:M -->
**What**

A per-dispatch policy field: `wait` (default — only dispatch issues whose blockers are merged), `stack` (blocker's PR is open, so set `baseRef` to that PR's head branch), and `ignore` (dispatch regardless; for issues whose only edges are soft ordering preferences).

**Why it matters**

Stacking is the most memorable idea in the project: **the dependency graph decides the git topology.** A dependent PR built on its blocker's branch shows only its own diff, and the agent writes against code that actually exists rather than against a guess.

Demo it **once, deliberately, on a pair we have verified** — and name the cost out loud. When the base PR merges, especially squash-merged, the stacked PR needs a rebase and GitHub shows a confusing diff until then. Being honest about that is worth more than pretending it's free.

`wait` being the default is itself part of the human-checkpoint story: the aggressive mode is opt-in, not the thing that happens to you.

Mitigations worth stating even if not built: stack one level only; stack only when the base PR has an approval; auto-comment "based on #NN, rebase after that merges".

**Scope**

- `src/lib/github/copilot.ts`, dispatch panel

**Done when**

- [ ] All three policies behave as described
- [ ] `wait` is the default everywhere
- [ ] A stacked PR is demonstrated working on a real pair
- [ ] The rebase caveat is documented in the README

**Depends on:** the briefing generator in #39 and the dispatch path in #37.
