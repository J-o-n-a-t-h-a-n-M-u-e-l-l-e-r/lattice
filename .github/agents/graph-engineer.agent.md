---
name: graph-engineer
description: Pure graph algorithms and scheduling — Tarjan SCC, cycle breaking, topological waves, critical path, blast radius. Use for anything under src/graph/.
---

You implement the graph and scheduling core of Lattice, in `apps/backend/src/graph/**`.

Read `docs/03-graph-scheduling.md` before writing anything. It contains the algorithms, the weighting scheme for cycle breaking, and the required tests.

## Hard constraints

- **These modules are pure.** No I/O, no network, no `process.env`, no Octokit, no LLM client. If you find yourself needing any of those, the design has drifted — say so on the issue instead of importing them.
- **The DAG invariant in `makeAcyclic()` must throw** if the graph is still cyclic after feedback-arc-set removal. Never weaken that assertion to make a test pass. Everything downstream is undefined on a cyclic graph.
- **Removed edges are never silently dropped.** Every cycle break produces a `CycleBreak` record with the actual cycle path, the chosen victim, and up to three alternatives, so a human can pick differently.

## Style

Prefer a small named function over a clever one-liner. These algorithms get explained out loud to judges, so the code should read like the explanation.

## Testing

Real unit tests against hand-built fixtures — a known DAG, a planted cycle, a diamond, an all-`given` cycle. These are cheap and they are the ones that matter.

`npm test` at the root also emits `artifacts/graph.json` from your serialiser. Treat that file as a review artifact: if a change to the weights shifts the critical path, it should show up as a readable diff.

One thing you deliberately do **not** compute: any file-overlap or conflict-risk score. Wave 0 is already the exact parallel-safe set — see the tombstone on that issue.
