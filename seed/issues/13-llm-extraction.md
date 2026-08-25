# [I] LLM edge extraction
<!-- labels: lane:inference,size:L -->
**What**

`src/lib/infer/llm.ts` — one call per cluster to **`stealth/ox-alpha` via OpenRouter** (free, 1M context, OpenAI-compatible), returning typed edges with confidence, rationale, and a verbatim evidence quote, plus per-issue effort estimates.

Read `docs/10-model-provider.md` before writing a line of this file.

The full system prompt and output schema are in `docs/02-inference-pipeline.md#l3-llm-edge-extraction`. Use them as written — the wording has been tuned against the failure modes.

**Why it matters**

This is the highest-risk, highest-value file in the repo. The governing principle: **the correct answer for most pairs is no edge.** Topical similarity is the dominant failure mode — two issues in the same area with the same label are usually not a dependency.

Two sentences in the prompt do most of the work: the operational test ("would have to be substantially redone"), which converts vague relatedness into a falsifiable claim, and the density expectation ("typically between 2 and 8"), which gives the model a prior that fights over-generation.

**The one spec that shapes this file: Ox Alpha does not enforce JSON schemas.** So don't rely on `response_format`. Declare a single `emit_edges` function tool, pin it with `tool_choice`, and treat the returned arguments as untrusted:

- Zod **`safeParse`**, never `parse`
- On failure, retry once with the validation error fed back as a user message
- On a second failure, drop that cluster and record it — one bad cluster must not fail the run

Other notes: feed already-known dependencies as ground-truth context so the model doesn't re-propose them. Keep the system prompt byte-stable (costs nothing, helps if caching exists — but don't build a cost argument on it). Use the plain `openai` SDK pointed at `https://openrouter.ai/api/v1`; no OpenRouter-specific library is needed.

**Cache responses to disk**, keyed by a hash of (model, system prompt, cluster content). The free tier allows 20 requests/min and 50/day — 1000/day with $10 of credits, which is worth buying before the hackathon. Prompt iteration without a cache will exhaust the day's quota re-deriving identical answers.

**Scope**

- `src/lib/infer/llm.ts`

**Done when**

- [ ] One call per cluster, run at concurrency 5 (safely under the 20/min limit)
- [ ] Output validates against the schema
- [ ] The system prompt is byte-stable and cached
- [ ] Nothing outside this file imports the OpenRouter client; model ID and base URL come from env
- [ ] Malformed output is caught by Zod, retried once, then dropped without failing the run
- [ ] Responses are cached to disk so re-runs cost no quota
- [ ] Request count and token usage per run are logged (requests are the scarce resource, not dollars — the model is free)

**Depends on:** the clustering in #12 for its input, and the types contract in #1 for `EdgeCandidate`.
