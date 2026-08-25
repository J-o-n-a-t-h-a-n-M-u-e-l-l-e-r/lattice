# [I] LLM edge extraction
<!-- labels: lane:inference,size:L -->
**What**

`src/lib/infer/llm.ts` — for each cluster, one call to `claude-opus-5` with adaptive thinking at `effort: "medium"`, returning typed edges with confidence, rationale, and a verbatim evidence quote, plus per-issue effort estimates.

The full system prompt and output schema are in `docs/02-inference-pipeline.md#l3-llm-edge-extraction`. Use them as written — the wording has been tuned against the failure modes.

**Why it matters**

This is the highest-risk, highest-value file in the repo. The governing principle: **the correct answer for most pairs is no edge.** Topical similarity is the dominant failure mode — two issues in the same area with the same label are usually not a dependency.

Two sentences in the prompt do most of the work: the operational test ("would have to be substantially redone"), which converts vague relatedness into a falsifiable claim, and the density expectation ("typically between 2 and 8"), which gives the model a prior that fights over-generation.

Implementation notes: keep the system prompt **byte-stable** across cluster calls so the prefix caches. Feed already-known dependencies as ground-truth context so the model doesn't re-propose them. Verify the structured-output SDK binding against current docs — the API changed and older `output_format` examples are stale. If latency hurts the demo, drop to `effort: "low"`; do not downgrade the model.

**Scope**

- `src/lib/infer/llm.ts`

**Done when**

- [ ] One call per cluster, run at concurrency 5
- [ ] Output validates against the schema
- [ ] The system prompt is byte-stable and cached
- [ ] Nothing outside this file imports the Anthropic SDK
- [ ] Token and cost per run are logged

**Depends on:** the clustering in #12 for its input, and the types contract in #1 for `EdgeCandidate`.
