# 01 · Architecture

## Stack decision: TypeScript / Next.js only. No Python.

Tempting to reach for Python + `networkx` for the graph work. Don't. Concretely:

- The **MCP server must be an HTTP endpoint Copilot can reach**. `@modelcontextprotocol/sdk` plus Vercel's `mcp-handler` maps a Streamable-HTTP MCP server onto a single App Router route handler. Adding Python means two deployables, two auth stories, and a CORS/proxy problem on a two-day clock.
- **Octokit** is the reference GitHub client and is TS-native. We need GraphQL with custom `GraphQL-Features` headers and REST with a custom `X-GitHub-Api-Version` — both one-liners there.
- The algorithms people reach for `networkx` for are, at our scale, **~200 lines of TypeScript**: Tarjan SCC, Kahn, longest-path DP, transitive-closure bitsets. Writing them ourselves is an advantage — we control the cycle-breaking weights (networkx won't do that for us) and we can explain them on stage.
- The only genuine Python pull is embeddings/clustering. We don't need sklearn: candidate generation is an inverted index plus cosine similarity over 30–200 vectors. Forty lines.

## The non-negotiable carve-out: the pipeline writes, everything else reads

The pipeline is a **background job** — triggered by GitHub issue events, a schedule, or `workflow_dispatch` — that writes to the store. It is also runnable as a CLI (`npx tsx scripts/analyze.ts`) for development and for the demo.

**Nothing else ever runs inference.** The web app and the MCP server read the store.

Three reasons, in order of importance:

1. A 60-second LLM pipeline inside a serverless route handler is a timeout landmine.
2. The store boundary means **the UI and MCP can be built against a fixture before the pipeline exists** — this is what unblocks parallel work in hour one, and it's why the fixture is an early issue.
3. Reads are constant and cheap; inference is occasional and expensive. Conflating them means every agent poll costs a model call.

The CLI form matters for one more reason: the terminal streaming through the inference layers is a good demo beat in its own right.

## Layout

```
lattice/
  scripts/
    seed.ts          # bulk-create the dogfood issues
    analyze.ts       # THE PIPELINE, as a CLI. Also runs as a triggered job.
    agent.ts         # local MCP client; proves the agent loop without Copilot
  src/lib/
    github/
      fetch.ts       # GraphQL bulk ingest + REST existing-deps
                     # (no write module — GitHub is read-only)
      copilot.ts     # suggestedActors + replaceActorsForAssignable
    infer/
      given.ts           # L1 native blocked_by + sub-issue hierarchy (no parsing)
      candidates.ts      # L2 optional clustering + path/symbol index
      llm.ts             # L3 OpenRouter edge extraction
      validate.ts        # L4 guards — safety-critical, nothing downstream catches
      merge.ts           # L5 scoring + blocking threshold
  src/graph/
    build.ts         # adjacency structures
    scc.ts           # Tarjan
    acyclic.ts       # weighted greedy feedback-arc-set + Kahn invariant
    schedule.ts      # waves, critical path, slack, blast radius
    serialize.ts     # graph -> the payload the UI renders (full graph, not reduced)
  app/
    page.tsx                        # graph view (React Flow)
    runs/page.tsx                   # run history: what changed, what was rejected
    api/dispatch/route.ts           # assign Copilot to a wave
    api/mcp/[transport]/route.ts    # MCP server
    api/webhook/route.ts            # GitHub issue events -> trigger a run
  src/store/
    schema.ts        # Drizzle schema: runs, issues, edges, rejections, schedule, cache
    index.ts         # the GraphStore interface — everything reads through this
    fixtures.ts      # DEMO_MODE binding: same interface, committed JSON, no DB
```

See [`11-graph-store.md`](11-graph-store.md) for the schema and the three cache layers.

## The one decision that matters

`src/graph/schedule.ts` is imported by **both the web app and the MCP server**, and its output is persisted once per run. One implementation of the scheduling maths, two consumers: the human sees the graph, the agent queries the same graph.

That shared module *is* the thesis of the project. Say it out loud in the demo.

## Where state lives — GitHub in, store out

| Tier | Contents | Home | Direction |
|---|---|---|---|
| **Source** | issues, native `blocked_by`, sub-issue hierarchy | **GitHub** | **read only** |
| **Everything else** | the full graph — every edge with type, confidence, evidence and provenance — plus rejections, cycle breaks, waves, critical path, blast radius, leases, run history, model response cache | **The store** (Postgres) | read/write |

**Lattice never writes to GitHub.** Not dependencies, not comments, not labels. Issues are an input.

That single constraint removes a category of risk from an unsupervised system: no write permissions to request, no secondary rate limit to dance around, no pruning logic that could delete someone's hand-recorded dependency, and no way for a hallucinated edge to appear to the rest of the team as if a human had asserted it.

**The cost, stated plainly:** the graph exists only where Lattice runs. It is not visible in GitHub's own UI and other tools don't inherit it. Mitigated by making it genuinely retrievable — an interactive graph anyone can open, and `explain_dependency` over MCP.

The write path runs the other way: **humans write, Lattice reads.** Editing `blocked_by` on GitHub is how you overrule the graph, and the next run treats it as ground truth. Full schema in [`11-graph-store.md`](11-graph-store.md).

## Data contract

Everything downstream of inference speaks `EdgeCandidate`. This type is defined **first** (issue `[F] Define shared types contract`) because five workstreams depend on it.

```ts
type SourceLayer =
  | 'given'        // native blocked_by read from GitHub — immutable ground truth
  | 'sub_issue'    // native hierarchy — read from GitHub, ground truth
  | 'llm'          // inferred
  | 'agent_reported';  // an agent hit this blocker while working

type DependencyType =
  | 'hard_blocker'        // B literally cannot be built until A exists
  | 'data_contract'       // B consumes an interface/schema/type A defines
  | 'shared_artifact'     // both edit the same artifact; order avoids conflict
  | 'ordering_preference'; // nice-to-have sequence, NOT a blocker

interface EdgeCandidate {
  blocked: number;        // issue number that is blocked
  blockedBy: number;      // issue number that blocks it
  type: DependencyType;
  confidence: number;     // 0..1
  source: SourceLayer;
  rationale: string;      // <= 200 chars, human-readable
  evidence?: { issue: number; quote: string };  // VERBATIM from that issue
  blocking?: boolean;     // does this edge constrain the schedule (score >= threshold)
  pinned?: boolean;       // human nudge: never remove, never cut in a cycle
  suppressed?: boolean;   // human nudge: never propose again
}
```

`pinned` and `suppressed` are the only human inputs in the system, and both are corrections applied *after* the fact — there is no gate anyone stands in front of. See [`11-graph-store.md`](11-graph-store.md#human-nudges--low-priority-but-design-the-columns-now).

`ordering_preference` never marks an edge `blocking`. This single enum value kills the dominant LLM failure mode — *"these are both frontend, so #4 depends on #3"* — by giving the model somewhere to put a weak intuition that isn't a dependency.
