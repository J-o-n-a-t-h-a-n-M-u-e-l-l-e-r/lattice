# 06 · Workstreams — the five-way split

Five people, five lanes. The lanes are chosen so that **the seams between them are data, not code** — each pair of workstreams meets at a JSON file or a typed interface, not at a shared implementation.

## The lanes

| # | Lane | Owns | Meets other lanes at |
|---|---|---|---|
| **F** | Foundation | monorepo scaffold, `packages/types`, **the store**, fixtures | `EdgeCandidate` + the API contract — *everyone* |
| **G** | GitHub I/O | `apps/backend/src/github/**`, `api/**` | **read only** — issues + deps in, REST out |
| **I** | Inference | `apps/backend/src/infer/**`, triggers | store in, store out |
| **S** | Graph & scheduling | `apps/backend/src/graph/**` | pure functions; edges in, schedule out |
| **U** | Web UI | `apps/web/**` | **consumes the REST API only** — no DB, no tokens |
| **M** | MCP & dispatch | `apps/backend/src/mcp/**`, `github/copilot.ts` | schedule (in), GitHub assignment (out) |

Six labels, five people — **F is shared setup done together in hour one**, then everyone moves into their lane.

## Suggested assignment for five

| Person | Lane | Start with | Then, in order |
|---|---|---|---|
| 1 | **G** — GitHub I/O | #5 ingest | #6 → #53 REST API → #37 → #39 |
| 2 | **I** — Inference | #13 LLM extraction | #14 → #15 → #16 → #46 |
| 3 | **S** — Graph & scheduling | #17 Tarjan | #18 → #19 → #20 → #21 → #51 |
| 4 | **U** — Web UI | #4 fixture *(first, ~30 min)* | #24 → #25 → #26 → #49 → #50 |
| 5 | **M** — MCP & store | #3 store | #47 → #30 → #36 → #32 → #31 → #33 → #34/#35 → #40 |

Hour 0–1 is everyone together on **#1** (types contract) and **#2** (scaffold). #1 blocks all five lanes, so settle it at a whiteboard rather than assigning it.

**#2 is on the critical path** — the inference chain `#11 → #12 → #13 → #14 → #15 → #16 → #46` is seven deep and holds both `size:L` issues. Nobody else has a chain that long.

**#4 before anything else for person 4.** A 30-minute hand-written fixture is what stops persons 4 and 5 idling for half a day.

Closed as superseded: **#7** write-back, **#8** receipt comments, **#10** regex extractors, **#22** Mermaid, **#23** conflict-risk scoring, **#27** review queue, **#28** cycle-resolution UI, **#29** approval wiring, **#38** conflict-free wave selection, **#48** pruning. Each carries a tombstone explaining what replaced it.

**#11** and **#12** (the symbol index and clustering) are now optional — they only matter if you enable the clustered inference path, which is off by default given the 1M context window. Treat them as stretch work.

## Why this parallelizes cleanly

Two decisions do all the work:

1. **`types.ts` is written first, together, in hour one.** Every lane codes against it. This is issue `[F] Define the shared types contract` and it genuinely blocks everything — which is a nice bit of dogfooding, since our own tool will discover exactly that edge.

2. **The REST contract (#53) and a fixture exist before the pipeline does.** The web lane codes against the contract from hour one and never waits for the store, the pipeline, or a database being up — it is a separate service that fetches JSON. This is the single most important scheduling decision in the plan, and the fixture doubles as `DEMO_MODE`.

The graph lane (S) is pure — no I/O — so it never conflicts with anyone and can be developed and tested completely standalone.

## Ordering within the day

```
Hour 0-1   EVERYONE:  repo, scaffold, types.ts, seed the dogfood issues
           ─────────────────────────────────────────────────────────────
Hour 1+    G: ingest ──────────► deps + hierarchy ──► Copilot dispatch
           I: deterministic ───► candidates ──► LLM ──► validate ──► merge
           S: SCC ────────────► acyclic ────► schedule ──► blast radius
           U: shell ──────────► graph view ──► run history
           M: mcp route ──────► tools ──────► copilot dispatch
```

The first checkpoint that matters: **the graph view renders the fixture, and `npx tsx scripts/analyze.ts` produces a real run in the store.** Those two meeting is the moment the project exists, and it arrives around hour three.

## Collision-avoidance rules

Five people plus several agents in one repo. These are not suggestions:

- **Stay in your lane's directories.** Every issue body lists a **Scope** — the files it may touch. If you need to change a file outside it, say so in the issue rather than doing it quietly.
- **`types.ts` changes are announced.** Anyone may propose one; nobody lands one without saying so, because it invalidates four other people's assumptions.
- **`src/graph/**` takes no dependencies on anything else.** If you find yourself importing Octokit there, the design has drifted.
- **Nothing outside `src/lib/github/` imports Octokit. Nothing outside `src/lib/infer/llm.ts` imports the OpenRouter client.** These two rules keep the seams clean and make the fallback modes possible.

## Stop-loss

**If it is end of Day 1 and the MCP or Copilot legs haven't started, freeze the scope.**

Ingest → infer → graph, deployed and interactive, is a complete, honest, submittable project. Spend Day 2 on polish, the README and the demo, not on opening a new leg.

The judging criteria say plainly: *"A half-built thing with clear thinking beats a polished thing with none."* Believe them.
