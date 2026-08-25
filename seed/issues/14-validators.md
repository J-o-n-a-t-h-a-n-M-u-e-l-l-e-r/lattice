# [I] Anti-hallucination validators
<!-- labels: lane:inference,size:M -->
**What**

`src/lib/infer/validate.ts` — the five guards from `docs/02-inference-pipeline.md#anti-hallucination-five-guards`:

1. **ID whitelist** — the model may only reference issues it was shown
2. **Evidence verification** — the quote must be a real substring of the cited issue, with a fuzzy second chance at ≥0.85 token overlap and a confidence haircut
3. **Soft-edge suppression** — `ordering_preference` never gets `writeBack: true`
4. **Deterministic precedence** — the model cannot flip an explicit "blocked by" a human wrote
5. **Density cap** — keep the top 1.5×|cluster| by confidence

Every rejection is recorded with its reason, not silently dropped.

These guards sit *after* the Zod schema validation in #13. Zod catches malformed shape; these catch well-formed nonsense. Both are needed — Ox Alpha does not enforce schemas, and no schema would ever have caught a fabricated evidence quote.

**Why it matters**

This file is what makes LLM output trustworthy enough to write into GitHub. Without guard 2 in particular, the human review gate becomes theatre — a reviewer skimming plausible rationales with no way to check them.

The rejection counts are also a feature, not an embarrassment. A line like `31 edges proposed · 3 rejected (1 fabricated evidence, 2 density cap) · 0 hallucinated IDs` is a credibility signal no other team will have. Surface it in the UI and the README.

**Scope**

- `src/lib/infer/validate.ts`

**Done when**

- [ ] All five guards implemented
- [ ] Rejections carry a machine-readable reason
- [ ] Counts by reason are exposed for the UI
- [ ] Unit-tested with a deliberately fabricated evidence quote

**Depends on:** the LLM extraction in #13, whose raw output it validates.
