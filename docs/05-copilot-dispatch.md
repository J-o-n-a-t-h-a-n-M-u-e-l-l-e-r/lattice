# 05 · Copilot dispatch

## The flow

`/api/dispatch` takes a wave and:

1. **Find the bot.** GraphQL `suggestedActors(capabilities: [CAN_BE_ASSIGNED], first: 100)` → look for login `copilot-swe-agent`. Cache the bot ID in `.lattice/raw.json` — it's stable, and the demo should never fail on a lookup.
2. **Select a conflict-free set.** Take wave-0 issues ranked by blast radius. Add the top issue; add each next one only if its `conflict_risk` against every already-selected issue is `< 0.4`.

   **Show the deferrals in the UI:**
   > *Deferred #14 — 0.62 file overlap with #12 (`src/graph/schedule.ts`)*

   That line is worth thirty seconds of demo on its own, because it's a problem that **only exists when your teammates are agents**. Two humans would have talked to each other.
3. **Assign** each selected issue via `replaceActorsForAssignable`.

---

## The mutation

```graphql
mutation {
  replaceActorsForAssignable(input: {
    assignableId: "ISSUE_NODE_ID",
    actorIds: ["COPILOT_BOT_ID"],
    agentAssignment: {
      targetRepositoryId: "REPO_NODE_ID",
      baseRef: "main",
      customInstructions: "...",
      customAgent: "",
      model: ""
    }
  }) { assignable { ... on Issue { id title } } }
}
```

Required header:

```
GraphQL-Features: issues_copilot_assignment_api_support,coding_agent_model_selection
```

Needs a **user token** (PAT or GitHub App user-to-server), not a plain installation token. Fine-grained PAT scopes: read+write on actions, contents, issues, pull requests.

---

## `customInstructions` — the biggest lever

This is where the graph writes the agent's brief. It's the difference between "agentic depth" and "AI bolted on".

```
You are working issue #12 as part of an orchestrated wave from the Lattice
dependency graph.

CONTEXT FROM THE GRAPH
- This issue currently blocks 3 others: #19, #23, #31 (blast radius 7).
- #19 needs the exported type `EdgeCandidate` from this issue. Do not rename it
  without saying so in the PR body.
- It is on the critical path. Prefer a correct minimal change over a broad refactor.

PARALLEL WORK — CONFLICT AVOIDANCE
- Another agent is working #17 in `src/lib/github/`. Do not modify files there.
- Your expected surface is: src/graph/scc.ts, src/graph/acyclic.ts.

WHEN YOU ARE DONE
- Call the `lattice` MCP server tool `report_progress` with
  { number: 12, status: "pr_opened", pr_url: <your PR url> }.
- If you discover this issue is actually blocked by something else, call
  `report_dependency` instead of working around it. It enters the graph for everyone.
```

Every line of that is derived from the graph. The agent gets the ordering knowledge for free instead of re-deriving it — which is the whole amortisation argument, made concrete.

---

## Branch stacking via `baseRef`

A policy field per dispatch. **Default `wait`.**

| Policy | Behaviour |
|---|---|
| `wait` | Only dispatch issues whose blockers are **merged**. Safe. Default. |
| `stack` | Blocker's PR is open → set `baseRef` to that PR's head branch. The dependent PR builds on top, and its diff shows only its own change. |
| `ignore` | Dispatch regardless. For issues whose only edges are `ordering_preference`. |

Stacking is the most memorable thing in this project — **the dependency graph decides the git topology** — so demo it **once, deliberately, on a pair you have verified.**

And be honest about the cost out loud: when the base PR merges (especially squash-merged), the stacked PR needs a rebase, and GitHub shows a confusing diff until then.

Mitigations to state, not necessarily build:
- only stack one level deep
- only stack when the base PR has an approval or is otherwise stable
- auto-comment on the stacked PR: *"based on #NN, rebase after that merges"*

**`wait` being the default is the conservative-by-construction choice** — the aggressive mode is opt-in, and that pattern (earn autonomy with tight defaults) is the same one behind the write threshold.

---

## MCP registration

Repo **Settings → Copilot → MCP servers**:

```json
{
  "mcpServers": {
    "lattice": {
      "type": "http",
      "url": "https://<our-deploy>/api/mcp",
      "headers": { "Authorization": "Bearer $COPILOT_MCP_LATTICE_TOKEN" },
      "tools": ["list_ready_work", "get_issue_context", "explain_dependency",
                "report_progress", "report_dependency", "simulate_completion"]
    }
  }
}
```

Constraints that will bite:

- **Secret names must start with `COPILOT_MCP_`.** Ours is `COPILOT_MCP_LATTICE_TOKEN`.
- **No OAuth** on remote MCP servers. Plan a static bearer token, not an auth flow.
- **Tool allowlist is required** — an omitted tool is simply invisible to the agent.
- Tools only. Resources and prompts are ignored.

Note `claim_next_issue` is deliberately **absent** from the Copilot allowlist above: Copilot is dispatched *to* a specific issue by `/api/dispatch`, so it doesn't need to claim. The tool exists for autonomous agents that pull work themselves (`scripts/agent.ts`, Claude Code).

---

## Demo fallbacks for this leg

1. **Dry-run mode** renders the exact GraphQL payload — bot ID, `baseRef`, full `customInstructions` — in a code block in the UI. Judges see the mechanism even if the bot is queued.
2. **Start the real run ~20 minutes before presenting**, then cut to it live. Copilot PRs take minutes, not seconds.
3. **`scripts/agent.ts`** — the local MCP client. Three seconds, no Copilot seat, proves the loop.

Build all three anyway; two of them are things you need for development regardless.
