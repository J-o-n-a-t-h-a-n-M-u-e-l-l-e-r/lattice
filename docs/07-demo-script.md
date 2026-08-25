# 07 · The two-minute demo

*"Can you make a stranger understand it in two minutes?"* — build backwards from this. Anything that doesn't serve a beat below is cut.

| Time | Beat | What's on screen |
|---|---|---|
| **0:00** | **The problem, shown not told.** *"Which of these can I start right now? Nobody knows — and we wrote them."* | Our own flat 45-issue backlog on github.com |
| **0:15** | **Nobody runs anything.** Edit an issue on GitHub. The webhook fires, a run starts on its own: *1 request · 31 edges · 3 rejected · 1 cycle*. | Run log streaming live |
| **0:35** | **It resolved a contradiction by itself.** The run found a cycle, cut the lowest-confidence link, and kept going. *"It never stopped to ask us — but it wrote down what it cut and why."* | Run detail: the cycle, the victim, the alternatives |
| **0:55** | **Back into GitHub.** *"Nobody clicked approve. GitHub is the source of truth now — delete our tool and the value stays."* | An issue page: native **Blocked by** populated |
| **1:15** | **The graph.** Hover #12 → *unblocks 7*. | Wave columns, critical path in red |
| **1:30** | **Dispatch.** Three Copilot agents on wave 0 — one deferred for file conflict, one stacked on another's branch. | `/` dispatch panel |
| **1:45** | **The loop closes.** `claim_next_issue` → briefing → `report_progress` → a node turns green, two more turn ready. Then an agent calls `report_dependency` and the graph *learns* an edge nobody knew about. | Terminal + graph side by side |
| **2:00** | **The line.** *"One expensive reasoning pass. Amortized over every agent run after it."* | |

## Four rules for the delivery

1. **Lead with the scheduler, not the visualization.** If you open with "look, a pretty graph", the obvious reaction is *"GitHub will just build this."* Open with *agents do the wrong work in the wrong order* — that's the part GitHub isn't fixing.

2. **Show the guards, not a person.** There's no human clicking approve, so the credibility beat has to come from somewhere else: the rejection counts (*"3 edges thrown out — one cited evidence that didn't exist in the issue"*) and the two-tier write threshold (*"speculative edges schedule but never touch GitHub"*). Rehearse that line — it is the answer to "how do you know it's not hallucinating?"

3. **Expect the autonomy question.** A judge will ask where the human is. The answer is in [`00-context.md`](00-context.md#-the-deliberate-trade-on-agentic-depth): checkpoints are structural rather than procedural, humans correct rather than approve, and agents feed the graph back. Have it ready in one breath.

4. **Never demo off a cold API.** Everything reads from the store. Do the bulk write-back *before* the demo and show an incremental delta live — the endpoint has a secondary rate limit and it will pick the worst moment.

## Timing the Copilot leg

Copilot PRs take minutes, not seconds. **Start the real run about 20 minutes before you present**, then cut to it. Show one in flight and one already open.

If it's misbehaving, `scripts/agent.ts` runs the same MCP loop locally in three seconds. Same server, same tools, no seat required.

## The one-sentence version

> A backlog is a flat list pretending to be a plan. Lattice infers the dependency graph, writes it into GitHub's native model, and serves the schedule to coding agents — automatically, on every issue event. One expensive reasoning pass becomes the scheduler for every cheap agent run after it.
