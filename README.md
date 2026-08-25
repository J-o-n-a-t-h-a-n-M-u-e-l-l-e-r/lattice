# Lattice

**A backlog is a flat list pretending to be a plan.**

Lattice infers the dependency graph hidden in your GitHub issues, writes it into GitHub's *native* issue-dependency model with a human in the loop, and then serves the resulting schedule to coding agents over MCP — so one expensive reasoning pass becomes the scheduler for every cheap agent run after it.

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
GitHub Issues ──► inference ──► candidate edges (type · confidence · verbatim evidence)
                                        │
                                 human review gate
                                        │
                        ┌───────────────┴───────────────┐
                        ▼                               ▼
            native GitHub blocked_by            derived schedule
            (source of truth)                   (waves · critical path · blast radius)
                                                        │
                                        ┌───────────────┴───────────────┐
                                        ▼                               ▼
                                  graph view                      MCP server
                                  (human: what's next)      (agent: what's next,
                                                             what's parallel, claim)
```

The one architectural commitment: **approved edges live in GitHub, not in Lattice.** Delete this tool and the value stays. `.lattice/` holds only the *reasoning* GitHub has nowhere to put — rationale, evidence, confidence, and who approved what.

## Why this answers the challenge

The hackathon asks: *"what does good collaboration look like when part of your team isn't human?"*

Coordination between human and non-human teammates **is scheduling**. Lattice makes the ordering explicit, keeps a human in the loop on every edge that gets committed, and then lets agents query the result instead of guessing at it. Agents may *propose* a dependency; only a human commits one.

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
| [`AGENTS.md`](AGENTS.md) | How agents should work in this repo |

## Quickstart

> Not yet — the scaffold is issue #1. This section is the "can someone else run it from your README?" judging criterion, so it gets written properly before submission. Target: clone to graph in ≤5 commands, plus a `DEMO_MODE=1` fixture path that needs no tokens at all.

## License

MIT
