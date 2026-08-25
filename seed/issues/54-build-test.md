# [F] One build script, one test script
<!-- labels: lane:foundation,size:S -->
**What**

npm workspaces at the repo root, with exactly two commands anyone needs to know:

```
npm run build     # builds both services
npm test          # runs every test, and emits the graph as machine-readable JSON
```

`npm test` writes `artifacts/graph.json` — the serialised graph produced from the committed fixture: nodes with wave, blast radius, critical-path flag and state; edges with type, confidence, source, blocking flag, rationale and evidence. Plus `artifacts/schedule.json` with the wave assignment and critical path.

**Why it matters**

Two services and five people is exactly the situation where "how do I run this?" quietly costs everyone twenty minutes a day. One root command, both apps, no per-package incantations. It is also what the README's quickstart promises, and "can someone else run it from your README?" is a scored judging criterion.

The JSON artifact matters for a less obvious reason: **it makes the graph diffable and assertable.** A test run produces a concrete file you can eyeball, commit as a golden fixture, diff across a change to the scheduler, or feed to another tool. When someone changes the cycle-breaking weights and the critical path shifts, that shows up as a reviewable diff rather than a vague feeling that the graph looks different.

It's also the cheapest possible integration test: if `artifacts/graph.json` comes out well-formed and acyclic, the whole pure-functional core is wired up correctly.

**Scope**

- Root `package.json` workspaces, `turbo.json` or plain npm scripts
- `apps/backend/src/scripts/emit-graph.ts`
- `artifacts/` (gitignored, except any committed golden file)

**Done when**

- [ ] `npm install && npm run build` succeeds from a clean clone
- [ ] `npm test` runs backend and web tests in one pass
- [ ] `npm test` emits valid `artifacts/graph.json` and `artifacts/schedule.json`
- [ ] The emitted graph is asserted acyclic
- [ ] Neither command needs a database or any credentials
- [ ] Both are the documented commands in the README

**Depends on:** the scaffold in #2 and graph serialisation in #51.
