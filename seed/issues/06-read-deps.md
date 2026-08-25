# [G] Read existing dependencies and sub-issue hierarchy
<!-- labels: lane:github-io,size:S -->
**What**

Two additions to the ingest layer:

1. `GET /repos/{o}/{r}/issues/{n}/dependencies/blocked_by` per issue, batched at concurrency 5, so we know what is *already* recorded.
2. Sub-issue `parent` / `subIssues` via GraphQL with the `sub_issues` feature header.

**Why it matters**

Two distinct reasons, and both matter:

- **Ground truth, and the human override path.** Native `blocked_by` becomes a `given` edge: confidence 1.0, immutable, never cut during cycle breaking, and the model may not contradict it. Since Lattice never writes to GitHub, this is the *only* way information flows toward the repo — a human edits `blocked_by`, and the next run treats it as fact.
- **Free high-confidence edges.** Sub-issue hierarchy gives us children-block-parent at confidence 0.99 with no model involved. Keep hierarchy distinct from `blocked_by` in the store — they are different relations and conflating them loses information.

Feeding already-known dependencies into the LLM prompt as ground-truth context also stops the model re-proposing edges that already exist.

**Scope**

- `src/lib/github/fetch.ts`

**Done when**

- [ ] Existing `blocked_by` edges land in `raw.json` as `source: 'given'`, confidence 1.0
- [ ] Sub-issue edges are marked as hierarchy, not conflated with `blocked_by`
- [ ] Concurrency is capped; a 30-issue repo doesn't trip rate limits

**Depends on:** the bulk ingest in #5 — this extends it rather than replacing it.
