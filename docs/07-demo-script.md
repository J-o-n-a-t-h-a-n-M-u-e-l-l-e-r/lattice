# 07 · The two-minute demo

*"Can you make a stranger understand it in two minutes?"* — build backwards from this. Anything that doesn't serve a beat below is cut.

| Time | Beat | What's on screen |
|---|---|---|
| **0:00** | **The problem, shown not told.** *"Which of these can I start right now? Nobody knows — and we wrote them."* | Our own flat 45-issue backlog on github.com |
| **0:15** | **Nobody runs anything.** Edit an issue on GitHub. The webhook fires, a run starts on its own: *1 request · 31 edges · 3 rejected · 1 cycle*. | Run log streaming live |
| **0:35** | **It resolved a contradiction by itself.** The run found a cycle, cut the lowest-confidence link, and kept going. *"It never stopped to ask us — but it wrote down what it cut and why."* | Run detail: the cycle, the victim, the alternatives |
| **0:55** | **The graph.** Wave columns, critical path in red. Click #12 → panel: *unblocks 7*, its blockers, the evidence for each edge. Click through to the issue on GitHub. | The app — this is the centrepiece, give it room |
| **1:15** | **Why that edge exists.** Open one dependency: rationale, confidence, and the verbatim quote from the issue that justifies it. *"It didn't guess — and it can show you where it got that."* | Edge detail |
| **1:30** | **The agent loop.** Three local agents claim wave-0 work at once — independent by construction — and receive graph-derived briefings. | Terminal |
| **1:45** | **The loop closes.** `claim_next_issue` → briefing → `report_progress` → a node turns green, two more turn ready. Then an agent calls `report_dependency` and the graph *learns* an edge nobody knew about. | Terminal + graph side by side |
| **2:00** | **The line.** *"One expensive reasoning pass. Amortized over every agent run after it."* | |

## Four rules for the delivery

1. **Lead with the scheduler, not the visualization.** If you open with "look, a pretty graph", the obvious reaction is *"GitHub will just build this."* Open with *agents do the wrong work in the wrong order* — that's the part GitHub isn't fixing.

2. **Show the guards, not a person.** There's no human clicking approve, so the credibility beat comes from the evidence trail: every edge quotes the text that justifies it, and the rejection counts show what was thrown out (*"one cited evidence that didn't exist in the issue"*). Rehearse that — it is the answer to "how do you know it isn't hallucinating?"

   The other half of the answer: **Lattice never writes to GitHub.** Nothing it infers can corrupt the repo. That is why it is allowed to run unsupervised.

3. **Expect the autonomy question.** A judge will ask where the human is. The answer is in [`00-context.md`](00-context.md#-the-deliberate-trade-on-agentic-depth): checkpoints are structural rather than procedural, humans correct rather than approve, and agents feed the graph back. Have it ready in one breath.

4. **Never demo off a cold API.** Everything reads from the store, and the model responses are cached — so the live run at 0:15 is fast and cannot fail on a network problem. Have a completed run already in the store as well.

## Demonstrating the agent loop

`scripts/agent.ts` runs the MCP loop locally in three seconds: agents claim work, receive their briefings, and report the graph changes they cause.

## The one-sentence version

> A backlog is a flat list pretending to be a plan. Lattice reads your issues, infers the dependency graph, and serves the schedule to coding agents — automatically, on every issue event. One expensive reasoning pass becomes the scheduler for every cheap agent run after it.
