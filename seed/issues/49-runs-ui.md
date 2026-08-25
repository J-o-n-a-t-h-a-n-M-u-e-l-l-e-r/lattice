# [U] `/runs` — the accountability surface
<!-- labels: lane:ui,size:L -->
**What**

Run history, and per run: trigger, duration, request count, edges proposed / kept / written / pruned, and three expandable sections.

- **Rejections** — what the validators threw out, grouped by reason, with the offending edge and its rationale
- **Cycles** — each cycle as a readable path (`#12 → #19 → #23 → #12`), which edge was cut, what the alternatives were
- **Below threshold** — edges that schedule but were not written to GitHub

Read-only. The pipeline already decided.

**Why it matters**

There is no approval queue, so **this is where the system accounts for itself.** It replaced `/review`, and it does a job the review queue never did: it shows what happens on *every* run, automatically, rather than only when someone sits down to review.

The Rejections section is the credibility beat in the demo. *"Three edges thrown out — one cited evidence that didn't exist in the issue"* is the answer to "how do you know it isn't hallucinating?", and it's more convincing than a human clicking approve, because it happens whether anyone is watching or not.

Below-threshold makes the two-tier write policy visible, which is otherwise invisible and is one of the better design decisions to be able to point at.

**Scope**

- `app/runs/page.tsx`, `app/runs/[id]/page.tsx`, components

**Done when**

- [ ] Run list with status, trigger and counts
- [ ] Rejections grouped by reason and legible
- [ ] Cycles render as paths, not sets, with the victim marked
- [ ] Below-threshold edges are listed with their scores
- [ ] Renders from the fixture with no database

**Depends on:** the app shell in #24, the store in #3, and the fixture in #4.
