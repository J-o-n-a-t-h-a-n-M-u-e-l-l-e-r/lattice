# [G] Receipt comments on applied edges
<!-- labels: lane:github-io,size:S -->
**What**

When an edge is written, post a comment on the blocked issue recording *why*: the dependency type, confidence, which model inferred it, who approved it, the rationale, and the verbatim evidence quote. Template is in `docs/02-inference-pipeline.md#the-receipt-comment`.

**Why it matters**

GitHub's dependency API stores the edge but has nowhere to put the reasoning. Without this, someone looking at a `Blocked by #12` badge six weeks from now has no idea whether a human decided that or a model guessed it.

It is also free demo value: the receipt is visible to anyone who never runs Lattice, and it's the visual proof that a human approved the edge rather than a script spraying them in.

**Scope**

- `src/lib/github/write.ts`

**Done when**

- [ ] A comment is posted for each successfully applied edge
- [ ] It names the approver and the model
- [ ] It includes the evidence quote
- [ ] It is suppressed in `--dry-run`

**Depends on:** the write-back path in #7 — this hangs off the same loop.
