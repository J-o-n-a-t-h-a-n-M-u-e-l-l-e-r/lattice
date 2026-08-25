# 07 · The two-minute demo

*"Can you make a stranger understand it in two minutes?"* — build backwards from this. Anything that doesn't serve a beat below is cut.

| Time | Beat | What's on screen |
|---|---|---|
| **0:00** | **The problem, shown not told.** *"Which of these can I start right now? Nobody knows — and we wrote them."* | Our own flat 28-issue backlog on github.com |
| **0:15** | **Run it.** Terminal streams the layers: *18 deterministic signals · 61 candidate pairs · 5 LLM calls · 31 edges · 3 rejected · 1 cycle* | `npm run analyze` |
| **0:35** | **The human checkpoint.** Approve a batch. **Flip one wrong direction live.** Resolve the cycle by choosing which link to cut. | `/review` |
| **0:55** | **Back into GitHub.** *"GitHub is the source of truth now. Delete our tool and the value stays."* | An issue page: native **Blocked by** populated, receipt comment showing the reasoning |
| **1:15** | **The graph.** Hover #12 → *unblocks 7*. | Wave columns, critical path in red |
| **1:30** | **Dispatch.** Three Copilot agents on wave 0 — one deferred for file conflict, one stacked on another's branch. | `/` dispatch panel |
| **1:45** | **The agent's view.** `claim_next_issue` → briefing → `report_progress` → a node turns green and two more turn ready. | Terminal + graph side by side |
| **2:00** | **The line.** *"One expensive reasoning pass. Amortized over every agent run after it."* | |

## Three rules for the delivery

1. **Lead with the scheduler, not the visualization.** If you open with "look, a pretty graph", the obvious reaction is *"GitHub will just build this."* Open with *agents do the wrong work in the wrong order* — that's the part GitHub isn't fixing.

2. **Show the rejection.** The moment you flip a wrong edge on camera is the moment the human checkpoint stops being a claim and becomes a demonstration. Rehearse which edge you'll flip; pick a genuinely wrong one.

3. **Never demo off a cold API.** Everything reads from `.lattice/raw.json`. Do the bulk write-back *before* the demo and show an incremental delta live — the endpoint has a secondary rate limit and it will pick the worst moment.

## Timing the Copilot leg

Copilot PRs take minutes, not seconds. **Start the real run about 20 minutes before you present**, then cut to it. Show one in flight and one already open.

If it's misbehaving, `scripts/agent.ts` runs the same MCP loop locally in three seconds. Same server, same tools, no seat required.

## The one-sentence version

> A backlog is a flat list pretending to be a plan. Lattice infers the dependency graph, writes it into GitHub's native model with a human in the loop, and serves the schedule to coding agents — so one expensive reasoning pass becomes the scheduler for every cheap agent run after it.
