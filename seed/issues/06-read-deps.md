# [G] Read existing dependencies and sub-issue hierarchy
<!-- labels: lane:github-io,size:S -->
**What**

Two additions to the ingest layer:

1. `GET /repos/{o}/{r}/issues/{n}/dependencies/blocked_by` per issue, batched at concurrency 5, so we know what is *already* recorded.
2. Sub-issue `parent` / `subIssues` via GraphQL with the `sub_issues` feature header.

**Why it matters**

Two distinct reasons, and both matter:

- **Idempotency.** The write-back path must diff against what already exists or it will create duplicate edges. This is where that knowledge comes from.
- **Free high-confidence edges.** Sub-issue hierarchy gives us children-block-parent at confidence 0.99 with no model involved. But these are flagged `writeBack: false` — GitHub already models hierarchy natively and duplicating it into `blocked_by` is noise. We *use* it in the scheduler; we don't write it back.

Feeding already-known dependencies into the LLM prompt as ground-truth context also stops the model re-proposing edges that already exist.

**Scope**

- `src/lib/github/fetch.ts`

**Done when**

- [ ] Existing `blocked_by` edges land in `raw.json` as `source: 'given'`, confidence 1.0
- [ ] Sub-issue edges are emitted with `writeBack: false`
- [ ] Concurrency is capped; a 30-issue repo doesn't trip rate limits

**Depends on:** the bulk ingest in #5 — this extends it rather than replacing it.
