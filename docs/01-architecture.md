# 01 · Architecture

## Stack decision: TypeScript / Next.js only. No Python.

Tempting to reach for Python + `networkx` for the graph work. Don't. Concretely:

- The **MCP server must be an HTTP endpoint Copilot can reach**. `@modelcontextprotocol/sdk` plus Vercel's `mcp-handler` maps a Streamable-HTTP MCP server onto a single App Router route handler. Adding Python means two deployables, two auth stories, and a CORS/proxy problem on a two-day clock.
- **Octokit** is the reference GitHub client and is TS-native. We need GraphQL with custom `GraphQL-Features` headers and REST with a custom `X-GitHub-Api-Version` — both one-liners there.
- The algorithms people reach for `networkx` for are, at our scale, **~200 lines of TypeScript**: Tarjan SCC, Kahn, longest-path DP, transitive-closure bitsets. Writing them ourselves is an advantage — we control the cycle-breaking weights (networkx won't do that for us) and we can explain them on stage.
- The only genuine Python pull is embeddings/clustering. We don't need sklearn: candidate generation is an inverted index plus cosine similarity over 30–200 vectors. Forty lines.

## The non-negotiable carve-out: the pipeline is a CLI, not a route

`npx tsx scripts/analyze.ts` reads GitHub and writes a JSON artifact. **The web app reads that artifact.** It does not run the pipeline.

Three reasons, in order of importance:

1. A 60-second LLM pipeline inside a serverless route handler is a timeout landmine.
2. The artifact-on-disk boundary means **the UI can be built against a fixture before the pipeline exists** — this is what unblocks parallel work in hour one, and it's why `[F] Fixture analysis.json` is an early issue.
3. A CLI is trivially resumable, cacheable, and demoable in a terminal. The terminal streaming through the inference layers is a good demo beat in its own right.

## Layout

```
lattice/
  scripts/
    seed.ts          # bulk-create the dogfood issues
    analyze.ts       # THE PIPELINE. GitHub -> .lattice/analysis.json
    apply.ts         # CLI twin of the approve + write-back step
    agent.ts         # local fake MCP client; proves the agent loop without Copilot
  src/lib/
    github/
      fetch.ts       # GraphQL bulk ingest + REST existing-deps
      write.ts       # blocked_by POST/DELETE, rate-limited, idempotent
      copilot.ts     # suggestedActors + replaceActorsForAssignable
    infer/
      deterministic.ts   # L1 extractors
      candidates.ts      # L2 candidate pairs + clustering
      llm.ts             # L3 Claude edge extraction
      validate.ts        # anti-hallucination guards
      merge.ts           # scoring, conflict resolution
    store.ts         # read/write .lattice/*.json, lease table
  src/graph/
    build.ts         # adjacency structures
    scc.ts           # Tarjan
    acyclic.ts       # weighted greedy feedback-arc-set + Kahn invariant
    schedule.ts      # waves, critical path, slack, blast radius
    mermaid.ts       # DAG -> mermaid string
  app/
    page.tsx                        # graph view (React Flow)
    review/page.tsx                 # human checkpoint queue
    api/approve/route.ts            # approve/reject -> write-back
    api/dispatch/route.ts           # assign Copilot to a wave
    api/mcp/[transport]/route.ts    # MCP server
  .lattice/
    raw.json         # cached GitHub ingest — demos never hit a cold API
    analysis.json    # proposed edges + rationale + confidence + provenance
    decisions.json   # human approve/reject log — COMMITTED, this is evidence
    leases.json      # agent claims — gitignored, ephemeral
```

## The one decision that matters

`src/graph/schedule.ts` is imported by **both the web app and the MCP server**. One implementation of the scheduling maths, two consumers: the human sees the graph, the agent queries the same graph.

That shared module *is* the thesis of the project. Say it out loud in the demo.

## Where state lives — three tiers

| Tier | Contents | Home | Why |
|---|---|---|---|
| **Truth** | Approved `blocked_by` edges | **GitHub native dependencies** | The whole thesis. Lattice can be deleted and the value survives. |
| **Provenance** | rationale, evidence quote, confidence, source layer, who approved, when | `.lattice/analysis.json` + `.lattice/decisions.json`, **committed to git** | GitHub's dependency API stores no *why*. Committing it makes the trail reviewable — and it is literally the "messy honest trail" the judges asked for. Rejected edges stay in the file. |
| **Runtime** | agent leases, in-flight branches, node status | `.lattice/leases.json`, gitignored | Ephemeral. Do not build a database. |

We also mirror the *why* into GitHub as a receipt comment on each blocked issue when an edge is applied — free, permanent, and visible to anyone who never runs Lattice. See [`02-inference-pipeline.md`](02-inference-pipeline.md#the-receipt-comment).

## Data contract

Everything downstream of inference speaks `EdgeCandidate`. This type is defined **first** (issue `[F] Define shared types contract`) because five workstreams depend on it.

```ts
type SourceLayer =
  | 'sub_issue' | 'explicit_text' | 'timeline_ref'
  | 'llm_cluster' | 'llm_adjudicate' | 'agent_reported' | 'human';

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
  writeBack?: boolean;    // false for soft edges and for sub-issue hierarchy
}
```

`ordering_preference` **never** gets written to GitHub. It exists only as a scheduler tie-break. This single enum value kills the dominant LLM failure mode — *"these are both frontend, so #4 depends on #3."*
