# 01 · Architecture

## Two services

```
   GitHub (read only)
   issues · blocked_by · sub-issues
              │
              ▼
   ┌──────────────────────────────────────┐
   │  BACKEND                             │
   │  pipeline · store · REST API · MCP   │
   │                                      │
   │   triggers ──► inference ──► store   │
   │                                │     │
   │            REST API  ◄─────────┘     │
   │            MCP server                │
   └──────────┬───────────────┬───────────┘
              │ REST          │ MCP
              ▼               ▼
        ┌───────────┐   coding agents
        │  WEB      │   (Copilot, Claude Code)
        │  Next.js  │
        │  graph UI │
        └───────────┘
```

**Backend** owns everything stateful: reading GitHub, running inference, the database, and both read surfaces — a REST API for the UI and an MCP server for agents. It is the only thing that touches the store.

**Web** is a Next.js app that renders the interactive graph. It holds no database credentials, no GitHub token, no model key. It fetches JSON and draws it.

They deploy independently.

### Why split them

- **The UI is a rendering concern, not a data concern.** A graph view that owns database credentials and GitHub tokens is a much larger attack surface than one that fetches JSON, and it can't be handed to a designer to iterate on.
- **They scale and fail differently.** Inference is occasional, slow and expensive; the UI is constant, fast and cacheable. A hung model call should not make the graph unreachable.
- **The REST API is needed regardless.** Agents already consume the graph over MCP, and the same store queries back both surfaces. Once there is an API, having the UI go around it to hit the database directly would be the odd choice.
- **It parallelises the team cleanly.** The web lane needs only the API contract and a fixture — it never waits on the store, the pipeline, or a database being up.

### Stack: TypeScript everywhere, one monorepo

npm workspaces, so there is still **one `npm run build` and one `npm test`** at the root (#54).

Backend is a plain Node service — no Next.js — because it is an API and a job runner, not a rendered app. The MCP server has to be an HTTP endpoint Copilot's cloud agent can reach on a public URL, which rules out anything file-based or local-only.

Python was considered for the graph work and rejected. The algorithms people reach for `networkx` for are, at our scale, ~200 lines of TypeScript: Tarjan SCC, Kahn, longest-path DP, transitive-closure bitsets. Writing them ourselves means we control the cycle-breaking weights and can explain them on stage — and it avoids a second runtime, a second deployment, and a serialisation seam.

## Layout

```
lattice/
  packages/
    types/           # the shared contract. Both services import this.
  apps/
    backend/
      src/
        github/
          fetch.ts     # GraphQL issue ingest + REST dependency reads (READ ONLY)
          copilot.ts   # suggestedActors + replaceActorsForAssignable
        infer/
          given.ts     # L1 native blocked_by + sub-issue hierarchy
          llm.ts       # L3 OpenRouter edge extraction
          validate.ts  # L4 guards — safety-critical, nothing downstream catches
          merge.ts     # L5 scoring + blocking threshold
          run.ts       # the pipeline, end to end
        graph/
          scc.ts       # Tarjan
          acyclic.ts   # weighted greedy feedback-arc-set + Kahn invariant
          schedule.ts  # waves, critical path, slack, blast radius
          serialize.ts # graph -> API payload (full graph, never reduced)
        store/
          schema.ts    # Drizzle: runs, issues, edges, rejections, schedule, cache
          index.ts     # the GraphStore interface
          fixtures.ts  # DEMO_MODE binding: same interface, committed JSON, no DB
        api/           # REST routes
        mcp/           # MCP server
        scripts/
          analyze.ts   # the pipeline as a CLI
          agent.ts     # local MCP client; proves the agent loop without Copilot
    web/
      app/
        page.tsx       # the interactive graph
        runs/page.tsx  # run history
      lib/api.ts       # typed REST client
```

## The one decision that matters

`apps/backend/src/graph/schedule.ts` produces the schedule **once per run**, and it is persisted. Both read surfaces serve that same computed result — the REST API to a human looking at the graph, MCP to an agent asking what to work on next.

One implementation of the scheduling maths, two audiences. That shared module *is* the thesis of the project. Say it out loud in the demo.

## Where state lives — GitHub in, store out

| Tier | Contents | Home | Direction |
|---|---|---|---|
| **Source** | issues, native `blocked_by`, sub-issue hierarchy | **GitHub** | **read only** |
| **Everything else** | the full graph — every edge with type, confidence, evidence and provenance — plus rejections, cycle breaks, waves, critical path, blast radius, leases, run history, model response cache | **The store** (Postgres) | read/write |

**Lattice never writes to GitHub.** Not dependencies, not comments, not labels. Issues are an input.

That single constraint removes a category of risk from an unsupervised system: no write permissions to request, no secondary rate limit to dance around, no pruning logic that could delete someone's hand-recorded dependency, and no way for a hallucinated edge to appear to the rest of the team as if a human had asserted it.

**The cost, stated plainly:** the graph exists only where Lattice runs. It is not visible in GitHub's own UI and other tools don't inherit it. Mitigated by making it genuinely retrievable — an interactive graph anyone can open, and `explain_dependency` over MCP.

The write path runs the other way: **humans write, Lattice reads.** Editing `blocked_by` on GitHub is how you overrule the graph, and the next run treats it as ground truth. Full schema in [`11-graph-store.md`](11-graph-store.md); API contract in [`12-rest-api.md`](12-rest-api.md).

## Data contract

Lives in `packages/types` and is imported by both services. Defined **first** (issue #1) because every lane codes against it.

```ts
type SourceLayer =
  | 'given'            // native blocked_by read from GitHub — immutable ground truth
  | 'sub_issue'        // native hierarchy — read from GitHub
  | 'llm'              // inferred
  | 'agent_reported';  // an agent hit this blocker while working

type DependencyType =
  | 'hard_blocker'         // B cannot be built until A exists
  | 'data_contract'        // B consumes an interface/schema/type A defines
  | 'shared_artifact'      // both edit the same artifact; order avoids rework
  | 'ordering_preference'; // nice-to-have sequence, NOT a blocker

interface EdgeCandidate {
  blocked: number;
  blockedBy: number;
  type: DependencyType;
  confidence: number;     // 0..1
  source: SourceLayer;
  rationale: string;      // <= 200 chars
  evidence?: { issue: number; quote: string };  // VERBATIM from that issue
  blocking?: boolean;     // score >= threshold: constrains the schedule
  pinned?: boolean;       // human nudge: always blocking, never cut in a cycle
  suppressed?: boolean;   // human nudge: never proposed again
}
```

Every edge is stored, whatever its score. `blocking` decides only whether it constrains the schedule — low-confidence edges stay visible as weak signals and can be promoted by a later run.

`ordering_preference` is never `blocking`. This single enum value kills the dominant LLM failure mode — *"these are both frontend, so #4 depends on #3"* — by giving the model somewhere to put a weak intuition that isn't a dependency.
