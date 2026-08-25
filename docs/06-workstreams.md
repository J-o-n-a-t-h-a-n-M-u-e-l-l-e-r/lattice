# 06 · Workstreams — the five-way split

Five people, five lanes. The lanes are chosen so that **the seams between them are data, not code** — each pair of workstreams meets at a JSON file or a typed interface, not at a shared implementation.

## The lanes

| # | Lane | Owns | Meets other lanes at |
|---|---|---|---|
| **F** | Foundation | scaffold, `types.ts`, **the store**, fixtures | `EdgeCandidate` + the store interface — *everyone* |
| **G** | GitHub I/O | `src/lib/github/**` | store (out), written edges (in) |
| **I** | Inference | `src/lib/infer/**`, `scripts/analyze.ts`, triggers | store in, store out |
| **S** | Graph & scheduling | `src/graph/**` | pure functions; edges in, schedule out |
| **U** | Web UI | `app/**` | reads the store |
| **M** | MCP & dispatch | `app/api/mcp/**`, `src/lib/github/copilot.ts`, `scripts/agent.ts` | schedule (in), GitHub assignment (out) |

Six labels, five people — **F is shared setup done together in hour one**, then everyone moves into their lane.

## Suggested assignment for five

| Person | Lane(s) | Rationale |
|---|---|---|
| 1 | **G** — GitHub I/O | Self-contained, API-heavy, unblocks I early. |
| 2 | **I** — Inference | The longest pole and the highest-risk. Give it a full person. |
| 3 | **S** — Graph & scheduling | Pure functions, testable in isolation, zero merge conflicts with anyone. |
| 4 | **U** — Web UI | Starts against a fixture in hour one, never blocked. |
| 5 | **M** — MCP & Copilot | Depends on S's output shape but not its implementation; can stub. |

## Why this parallelizes cleanly

Two decisions do all the work:

1. **`types.ts` is written first, together, in hour one.** Every lane codes against it. This is issue `[F] Define the shared types contract` and it genuinely blocks everything — which is a nice bit of dogfooding, since our own tool will discover exactly that edge.

2. **A fixture bound to the `GraphStore` interface exists before the pipeline does.** The UI and MCP lanes read that interface from hour one and never wait for the inference lane. This is the single most important scheduling decision in the plan — and it doubles as `DEMO_MODE`.

The graph lane (S) is pure — no I/O — so it never conflicts with anyone and can be developed and tested completely standalone.

## Ordering within the day

```
Hour 0-1   EVERYONE:  repo, scaffold, types.ts, seed the dogfood issues
           ─────────────────────────────────────────────────────────────
Hour 1+    G: ingest ──────────► write-back
           I: deterministic ───► candidates ──► LLM ──► validate ──► merge
           S: SCC ────────────► acyclic ────► schedule ──► blast radius
           U: shell ──────────► graph view ──► run history
           M: mcp route ──────► tools ──────► copilot dispatch
```

The first checkpoint that matters: **`npx tsx scripts/analyze.ts --no-llm` prints a Mermaid DAG of the explicit dependencies.** That is demoable on its own and it arrives around hour three.

## Collision-avoidance rules

Five people plus several agents in one repo. These are not suggestions:

- **Stay in your lane's directories.** Every issue body lists a **Scope** — the files it may touch. If you need to change a file outside it, say so in the issue rather than doing it quietly.
- **`types.ts` changes are announced.** Anyone may propose one; nobody lands one without saying so, because it invalidates four other people's assumptions.
- **`src/graph/**` takes no dependencies on anything else.** If you find yourself importing Octokit there, the design has drifted.
- **Nothing outside `src/lib/github/` imports Octokit. Nothing outside `src/lib/infer/llm.ts` imports the OpenRouter client.** These two rules keep the seams clean and make the fallback modes possible.

## Stop-loss

**If it is end of Day 1 and write-back doesn't work, freeze the scope.**

Ingest → infer → review → graph, with Mermaid posted to a tracking issue, is a complete, honest, submittable project. Spend Day 2 on the README and the demo, not on opening a new leg.

The judging criteria say plainly: *"A half-built thing with clear thinking beats a polished thing with none."* Believe them.
