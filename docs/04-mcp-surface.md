# 04 · MCP surface

Mounted at `/api/mcp`, Streamable HTTP, bearer auth from `COPILOT_MCP_LATTICE_TOKEN`.

**Tools only** — Copilot cloud agent supports MCP *tools* but ignores resources and prompts. Every tool also needs an entry in the repo's Copilot MCP `tools` allowlist.

## The design principle, stated on stage

> **Read tools are free. Write tools go to humans.**

No MCP tool ever mutates a GitHub dependency. `propose_dependency` queues an edge for human review; that's it. This is the project's central claim about agentic collaboration — do not route around it for convenience.

## Why this isn't a GitHub API wrapper

The official GitHub MCP server already exposes issue reads and writes. Ours exposes **the thing that doesn't exist anywhere else: the derived schedule.** If a tool here could be replaced by a call to `github-mcp-server`, it doesn't belong here.

---

## The seven tools

### 1 · `list_ready_work` — the main event

```ts
list_ready_work({ limit?: number = 5, area?: string, exclude_claimed?: boolean = true })
 -> { generated_at, wave0_size, items: [{
        number, title, url, wave, effort_days, blast_radius, on_critical_path,
        slack_days, unblocks: number[],
        reason: "ready · critical path · unblocks 7",
        suggested_base_ref: string,
        conflict_risk: [{ number, score, shared: string[] }]
      }] }
```

`reason` is a human sentence, not a score. The agent can put it in a PR description.

### 2 · `claim_next_issue` — the coordination primitive

```ts
claim_next_issue({ agent_id: string, lease_minutes?: number = 45, area?: string })
 -> { claimed: true, issue: {...}, lease_expires_at, base_ref,
      briefing: "You are unblocking #19 and #23. Do not touch src/graph/scc.ts —
                 agent-b holds #12." }
  | { claimed: false, reason: 'no_ready_work' | 'all_claimed', next_available_at? }
```

Atomic, so N parallel agents don't collide. Leases live in `.lattice/leases.json` with a TTL; expired leases are reclaimed on read.

**This is the tool that makes Lattice a scheduler rather than a report.** It is also the most direct answer to the hackathon's question — it is literally the protocol by which human and non-human teammates avoid stepping on each other.

Optionally mirror the claim to GitHub with a `lattice:claimed-by-<agent>` label. Free, and visible in the demo.

### 3 · `get_issue_context`

```ts
get_issue_context({ number: number })
 -> { issue,
      blockers:   [{ number, state, pr_url?, branch?, merged }],
      dependents: [{ number, title, what_they_need_from_you }],
      why_this_matters, recommended_base_ref, files_likely_touched: string[] }
```

Everything the agent needs to start, without re-reading the whole backlog. `what_they_need_from_you` is the part that prevents an agent from renaming an exported type four other issues depend on.

### 4 · `explain_dependency`

```ts
explain_dependency({ blocked: number, blocked_by: number })
 -> { type, confidence, source, rationale, evidence, approved_by, approved_at }
```

The audit trail, exposed to the agent too. If an agent thinks an edge is wrong, it can see *why* the edge exists before arguing with it.

### 5 · `report_progress` — the graph delta

```ts
report_progress({
  agent_id: string, number: number,
  status: 'started' | 'pr_opened' | 'blocked' | 'done' | 'abandoned',
  pr_url?: string, branch?: string, note?: string
}) -> { ok,
        graph_delta: {
          newly_ready: number[],        // <- the money shot
          critical_path_changed: boolean,
          remaining_days: number
        },
        next_suggestion?: {...} }
```

`newly_ready` is the closing beat of the demo: the agent finishes, and the graph immediately tells it what it just unlocked. **That's what turns a graph into a control loop rather than a report.**

### 6 · `propose_dependency` — the human gate

```ts
propose_dependency({
  agent_id: string,
  blocked: number,
  blocked_by: number | { new_issue_title: string },
  rationale: string,
  evidence: string
}) -> { status: 'queued_for_human_review', review_url, queue_position }
```

Lands in the **same** `/review` queue as LLM-inferred edges, with `source: 'agent_reported'`. Never auto-applied.

Say this on stage: *"the agent can propose, only a human can commit."*

### 7 · `simulate_completion` — the "what if"

```ts
simulate_completion({ numbers: number[] })
 -> { newly_ready: [{ number, title }], new_critical_path: number[],
      days_saved: number, max_parallelism_after: number }
```

Great demo line, ~20 lines of code — it reuses the wave function with those issues marked closed. *"If we finish these two today, what opens up tomorrow?"*

---

## Testing

- `npx @modelcontextprotocol/inspector` against the running server.
- Connect **Claude Code** to it and ask "what should I work on next".
- `scripts/agent.ts` is a real MCP *client* that calls `claim_next_issue` → prints the briefing → `report_progress`. Runs in three seconds, proves the loop, needs no Copilot seat.

Build `scripts/agent.ts` regardless of Copilot's health — it's how the MCP server gets tested, **and** it's the fallback demo if Copilot misbehaves on the day.
