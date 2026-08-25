# [I] Deterministic extractors for explicit dependency phrasing
<!-- labels: lane:inference,size:M -->
**What**

`src/lib/infer/deterministic.ts` — regex extraction of directional dependency language from issue titles and bodies. Both directions: "blocked by / depends on / requires / needs / waiting on / after / prerequisite" and the inverse "blocks / unblocks / must land before / enables". Patterns are in `docs/02-inference-pipeline.md#l1-deterministic-extractors`.

Confidence 0.95, `source: 'explicit_text'`, evidence = the matched sentence trimmed to 160 chars.

**Why it matters**

This layer is our primary fallback. If the LLM leg is slow, expensive, or noisy on the day, `--no-llm` still produces a real graph from these signals — and the fallback costs zero because we built it first anyway. Don't let it rot once the model layer works.

Two guards that matter: reject matches inside code fences (an issue quoting a snippet that mentions `#123` is not declaring a dependency), and reject matches inside a blockquote of someone else's text.

**Important non-edge:** a bare `#123` with no directional phrase is **not** an edge. A mention is not a dependency. Emit it as a candidate pair for the clustering layer instead.

**Scope**

- `src/lib/infer/deterministic.ts`

**Done when**

- [ ] Both directions extract correctly, with the right `blocked`/`blockedBy` orientation
- [ ] Code fences and blockquotes are excluded
- [ ] Bare mentions produce candidate pairs, not edges
- [ ] Runs with no network and no API key

**Depends on:** the types contract in #1, and ingested issues from #5.
