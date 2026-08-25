# AGENTS.md — how to work in this repo

Read this before changing anything. It applies to Copilot coding agent, Claude Code, and any other agent working here.

## What this project is

Lattice infers dependency edges between GitHub issues, gets a human to approve them, writes them into GitHub's native `blocked_by` model, and serves the resulting schedule to coding agents over MCP. See [`README.md`](README.md) for the pitch and [`docs/01-architecture.md`](docs/01-architecture.md) for the component map.

## Ground rules

1. **GitHub is the source of truth for approved edges.** Never invent a side database for dependencies. `.lattice/` stores reasoning and runtime state only.
2. **No agent writes a dependency.** Agents may call `propose_dependency`, which queues an edge for human review. Committing an edge to GitHub is a human action. This is the project's central claim — do not route around it.
3. **The DAG invariant is load-bearing.** `makeAcyclic()` must throw if the graph is still cyclic after cycle-breaking. Never weaken that assertion to make a test pass.
4. **Every inferred edge carries verbatim evidence.** If code drops the `evidence` field or stops validating it against the source text, the human review gate becomes theatre. Guard it.
5. **Read before you write.** Check [`docs/09-github-api-notes.md`](docs/09-github-api-notes.md) before touching any GitHub call — several endpoints have non-obvious requirements that will silently produce wrong behaviour.

## Working on an issue

- The issue title is prefixed with its workstream (`[F]`, `[G]`, `[I]`, `[S]`, `[U]`, `[M]`, `[C]`, `[X]`). See [`docs/06-workstreams.md`](docs/06-workstreams.md).
- Issue bodies state their own dependencies in prose ("depends on", "blocked by"). **Respect them** — if your issue depends on a type or interface another issue defines, and that issue isn't done, say so rather than inventing a competing shape.
- Stay inside the files listed under **Scope** in the issue body. Five people and several agents are working this repo in parallel; the scope list is the collision-avoidance mechanism.
- If you discover the issue is genuinely blocked by something not listed, **say so in a comment and stop** rather than expanding scope. If the Lattice MCP server is available to you, call `propose_dependency` instead.

## Conventions

- **TypeScript, strict mode.** No `any` in `src/lib/**` without a comment explaining why.
- **Pure functions in `src/graph/**`.** No I/O, no network, no `process.env`. These are the parts we unit-test and the parts we explain on stage.
- **All GitHub network access goes through `src/lib/github/`.** Nothing else imports Octokit.
- **All LLM access goes through `src/lib/infer/llm.ts`.** Nothing else imports the OpenRouter client. Model ID and base URL come from env, never hardcoded at a call site — see [`docs/10-model-provider.md`](docs/10-model-provider.md).
- Every module that reads config takes it as an argument. Read `process.env` at the entrypoints only (`scripts/*.ts`, route handlers).
- Prefer a small named function over a clever one-liner. Several of these algorithms get explained to judges out loud.

## Testing

- `src/graph/**` gets real unit tests against hand-built fixtures — a known DAG, a planted cycle, a diamond. These are cheap and they are the ones that matter.
- The inference layers are validated against a hand-labelled gold set (see issue `[X]  Gold-set labelling`), not by unit test. Report precision, don't assert it.
- Anything touching the GitHub write path must be exercised in `--dry-run` before it runs for real.

## Things that will waste your time if you don't know them

- `POST .../dependencies/blocked_by` wants the issue's **integer `databaseId`**, not the `#number` you see in the UI. Fetch both during ingest.
- Sub-issue and Copilot-assignment GraphQL calls need specific `GraphQL-Features` headers.
- The dependency write endpoint has a **secondary** rate limit. Space writes out; don't burst.

Full detail in [`docs/09-github-api-notes.md`](docs/09-github-api-notes.md).

## What "done" means

An issue is done when: the code works, `src/graph/**` changes have tests, `--dry-run` was exercised for write-path changes, and the PR body says what you'd want a teammate to know in six months. Not when it compiles.
