# Lattice

**A backlog is a flat list pretending to be a plan.**

Lattice infers the dependency graph hidden in your GitHub issues and serves the resulting schedule to coding agents over MCP — so one expensive reasoning pass becomes the scheduler for every cheap agent run after it.

It runs on its own. Issue events and a schedule trigger it; nobody clicks anything.

**It never writes to GitHub.** Issues are a data source, not a data store.

> Microsoft Hackathon 2026 · Challenge: *Collaboration using GitHub Planning & Tracking Tools in the Agentic Age*

---

## The problem

Issues depend on each other. The API must exist before the UI consumes it; the schema migration before the query; the type contract before the four things that import it. Humans hold that ordering in their heads and it never gets written down.

That was tolerable when a human picked the next ticket. It stops being tolerable when your teammate is an agent:

- An agent handed a flat backlog **does the wrong work in the wrong order** — it writes a frontend against an endpoint that doesn't exist yet, and the output is garbage no matter how good the model is.
- Every agent run **re-derives the same ordering from scratch**. That triage pass is the expensive part of the request, repeated N times and thrown away each time.
- Nothing says what is **safe to run in parallel** — which is the entire reason to have more than one agent.

**GitHub already has the data model for this, and it is empty.** Issue dependencies (`blocked_by` / `blocking`) went GA in 2025 with full REST, GraphQL and `gh` support. Almost nobody fills them in, because doing so is manual and pairwise — O(n²) human effort for a payoff no single person feels. And where they *are* filled in, GitHub renders them as a flat text list; there is still no graph view.

So: **the schema exists, the data doesn't, and the view doesn't.**

## What Lattice does

```
  GitHub (read only)
  issues · blocked_by · sub-issues
             │
             ▼
  ┌──────────────────────────────────────┐
  │  BACKEND                             │
  │   inference ──► the full graph       │
  │                      │               │
  │        REST API ◄────┴────► MCP      │
  └──────────┬─────────────────┬─────────┘
             │ REST            │ MCP
             ▼                 ▼
     interactive graph    coding agents
     (human: what's next)  (agent: what's next,
                            what's parallel, claim)
```

The one architectural commitment: **GitHub is a data source, not a data store.** Lattice reads issues, native `blocked_by` and sub-issue hierarchy every run, and writes nothing back — no dependencies, no comments, no labels.

That makes the system **non-destructive by construction**, which is what earns it the right to run unsupervised. There is no automatic writer that could corrupt a shared repo and no pruning logic that could delete a dependency someone recorded by hand. The worst a bad inference can do is mis-order our own suggestions until the next run corrects it.

The write path runs the other way: **humans write, Lattice reads.** Anyone who wants to overrule the graph edits `blocked_by` on GitHub, and the next run treats it as ground truth the model may not contradict.

## Why this answers the challenge

The hackathon asks: *"what does good collaboration look like when part of your team isn't human?"*

Coordination between human and non-human teammates **is scheduling** — and a scheduler that needs a human to approve each decision isn't a scheduler, it's a queue with extra steps.

So Lattice maintains the ordering by itself, continuously, and both kinds of teammate read from the same graph. Agents don't just consume it: an agent that hits an unrecorded blocker reports it back, and the graph is more accurate for whoever asks next.

**The shared workspace gets better as anyone works in it.** Humans stay in control by correcting it — pinning an edge, suppressing one, or just editing `blocked_by` on GitHub, which the next run picks up as ground truth — rather than by standing in front of it.

## Status

🚧 Under construction at the hackathon. See [`docs/06-workstreams.md`](docs/06-workstreams.md) for the five parallel workstreams and the open issues.

## Documentation

| Doc | What's in it |
|---|---|
| [`docs/00-context.md`](docs/00-context.md) | Hackathon context, judging criteria, submission requirements |
| [`docs/01-architecture.md`](docs/01-architecture.md) | Components, data flow, where state lives, stack decision |
| [`docs/02-inference-pipeline.md`](docs/02-inference-pipeline.md) | The five inference layers, the LLM prompt, anti-hallucination guards |
| [`docs/03-graph-scheduling.md`](docs/03-graph-scheduling.md) | Tarjan, cycle breaking, waves, critical path, blast radius |
| [`docs/04-mcp-surface.md`](docs/04-mcp-surface.md) | The seven MCP tools agents call |
| [`docs/05-copilot-dispatch.md`](docs/05-copilot-dispatch.md) | Assigning Copilot, briefing injection, branch stacking |
| [`docs/06-workstreams.md`](docs/06-workstreams.md) | The five-way parallel split for the team |
| [`docs/07-demo-script.md`](docs/07-demo-script.md) | The two-minute demo, beat by beat |
| [`docs/08-risks.md`](docs/08-risks.md) | Honest weaknesses, fallbacks, stop-loss rules |
| [`docs/09-github-api-notes.md`](docs/09-github-api-notes.md) | Verified endpoints, headers, and the gotchas that will bite |
| [`docs/10-model-provider.md`](docs/10-model-provider.md) | OpenRouter + Ox Alpha: setup, schema caveat, rate limits, privacy |
| [`docs/11-graph-store.md`](docs/11-graph-store.md) | Where the graph is persisted, and the three cache layers |
| [`docs/12-rest-api.md`](docs/12-rest-api.md) | The REST contract the web app consumes |
| [`AGENTS.md`](AGENTS.md) | How agents should work in this repo |

## Quickstart

> Not yet — the scaffold is issue #1. This section is the "can someone else run it from your README?" judging criterion, so it gets written properly before submission. Target: clone to graph in ≤5 commands, plus a `DEMO_MODE=1` fixture path that needs no tokens at all.

## License

MIT
