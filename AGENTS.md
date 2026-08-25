# AGENTS.md — how to work in this repo

Read this before changing anything. It applies to Copilot coding agent, Claude Code, and any other agent working here.

## What this project is

Lattice reads a repo's issues, infers the dependency graph between them, stores it, and serves the resulting schedule over a REST API (to the web UI) and MCP (to coding agents). It runs automatically on issue events and a schedule — no approval step, no button.

**GitHub is a data source, not a data store. Lattice never writes to it.**

Two services in one npm-workspaces monorepo: `apps/backend` (pipeline, store, REST, MCP) and `apps/web` (the interactive graph). `apps/web` consumes the REST API and holds no database URL, GitHub token or model key. See [`README.md`](README.md) for the pitch and [`docs/01-architecture.md`](docs/01-architecture.md) for the component map.

## Ground rules

1. **Never write to GitHub.** No dependency writes, no comments, no labels, no issue edits. Reads only. This is what makes an unsupervised system safe to run, and it is not negotiable for convenience.
2. **The full graph lives in the store.** Every edge, above and below the blocking threshold. The one destructive step is cycle breaking, and it is recorded. Transitive reduction is a *rendering* choice — never store the reduced graph.
3. **The DAG invariant is load-bearing.** `makeAcyclic()` must throw if the graph is still cyclic after cycle-breaking. Never weaken that assertion to make a test pass.
4. **Every inferred edge carries verbatim evidence, validated against source text.** Nothing downstream re-checks it — an edge whose evidence can't be verified is one nobody can audit after it has been written to a real issue. Guard it.
5. **Read before you write.** Check [`docs/09-github-api-notes.md`](docs/09-github-api-notes.md) before touching any GitHub call — several endpoints have non-obvious requirements that will silently produce wrong behaviour.

## Working on an issue

- The issue title is prefixed with its workstream (`[F]`, `[G]`, `[I]`, `[S]`, `[U]`, `[M]`, `[C]`, `[X]`). See [`docs/06-workstreams.md`](docs/06-workstreams.md).
- Issue bodies state their own dependencies in prose ("depends on", "blocked by"). **Respect them** — if your issue depends on a type or interface another issue defines, and that issue isn't done, say so rather than inventing a competing shape.
- Stay inside the files listed under **Scope** in the issue body. Five people and several agents are working this repo in parallel; the scope list is the collision-avoidance mechanism.
- If you discover the issue is genuinely blocked by something not listed, **say so and stop** rather than expanding scope. If the Lattice MCP server is available, call `report_dependency` so the graph learns it.

## Build and test

Two commands, from the repo root:

```
npm run build     # both services
npm test          # all tests, and emits artifacts/graph.json
```

`npm test` writes the serialised graph as JSON, which makes the schedule diffable — change the cycle-breaking weights and the critical path shift shows up as a reviewable diff. Neither command needs a database or credentials.

## Conventions

- **TypeScript, strict mode.** No `any` in `src/lib/**` without a comment explaining why.
- **Pure functions in `apps/backend/src/graph/**`.** No I/O, no network, no `process.env`. These are the parts we unit-test and the parts we explain on stage.
- **All GitHub network access goes through `apps/backend/src/github/`.** Nothing else imports Octokit, and `apps/web` must not be able to.
- **`apps/web` talks only to the REST API.** No store import, no Octokit, no model client. If a change needs data the API doesn't expose, extend the API (#53) rather than reaching around it.
- **All LLM access goes through `apps/backend/src/infer/llm.ts`.** Model ID and base URL come from env, never hardcoded — see [`docs/10-model-provider.md`](docs/10-model-provider.md). There is always a model; there is no model-free mode.
- Every module that reads config takes it as an argument. Read `process.env` at the entrypoints only (`scripts/*.ts`, route handlers).
- Prefer a small named function over a clever one-liner. Several of these algorithms get explained to judges out loud.

## Testing

- `apps/backend/src/graph/**` gets real unit tests against hand-built fixtures — a known DAG, a planted cycle, a diamond. These are cheap and they are the ones that matter.
- `npm test` also emits `artifacts/graph.json`; if that comes out well-formed and acyclic, the whole pure-functional core is wired up correctly.
- The inference layers are validated against a hand-labelled gold set (see issue `[X]  Gold-set labelling`), not by unit test. Report precision, don't assert it.

## Things that will waste your time if you don't know them

- Fetch `databaseId` alongside `number` during ingest. `number` is what humans see; `databaseId` is the stable identifier across renames.
- Sub-issue GraphQL calls need a specific `GraphQL-Features` header.
- Native `blocked_by` read from GitHub becomes a `given` edge — immutable, and the model may not contradict it. That is how a human overrules the graph.

Full detail in [`docs/09-github-api-notes.md`](docs/09-github-api-notes.md).

## What "done" means

An issue is done when: the code works, `src/graph/**` changes have tests, and the PR body says what you'd want a teammate to know in six months. Not when it compiles.
