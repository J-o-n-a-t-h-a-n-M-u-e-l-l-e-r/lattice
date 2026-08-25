# [I] Merge and confidence scoring
<!-- labels: lane:inference,size:M -->
**What**

`src/lib/infer/merge.ts` — combine candidates for the same `(blocked, blockedBy)` pair from all layers into a single scored edge.

Independent-evidence combination `score = 1 - Π(1 - cᵢ)`, a small bonus when distinct source layers agree, and a penalty plus a `contested` flag when both directions were proposed. Then band the results: ≥0.85 recommended-accept, 0.50–0.85 needs-review, <0.50 parked but retained.

**Why it matters**

Agreement across *distinct* layers is much stronger evidence than the same layer firing twice — a regex match and a model inference pointing the same way is worth more than two model calls agreeing with themselves. The scoring should reflect that.

The `contested` flag matters too: when the model proposed both A→B and B→A across different clusters, that pair is genuinely ambiguous and must go to a human regardless of score. Same for anything involved in a cycle break.

Parked edges stay in `analysis.json` rather than being deleted — they're behind a "show low confidence" toggle in the review UI, and they're part of the honest record.

**Scope**

- `src/lib/infer/merge.ts`

**Done when**

- [ ] Duplicate pairs across layers collapse into one scored edge
- [ ] Distinct-layer agreement is rewarded
- [ ] Contested pairs are flagged and forced to review
- [ ] Provenance from every contributing layer is preserved on the merged edge

**Depends on:** validated LLM edges from #14 and deterministic edges from #10.
