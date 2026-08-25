# [U] `/review` — the human approval queue
<!-- labels: lane:ui,size:L -->
**What**

One table of proposed edges: from, to, type, confidence, rationale, evidence. Sorted **confidence ascending** so the sketchy ones surface first. Row actions: approve, reject, and **flip direction**. A bulk "approve all ≥ 0.85" with a visible count. Hovering a row highlights that edge in the graph. A collapsed Rejections section shows what the validators threw out and why.

Every decision appends to `.lattice/decisions.json`, which is committed.

**Why it matters**

This is the human checkpoint the judging criteria explicitly reward, and it has to be visibly real rather than a rubber stamp.

**Flip direction is the feature that makes it real.** Wrong direction is the most common model error, and offering flip rather than just approve/reject turns the reviewer into an editor. Flipping one wrong edge on camera at 0:35 is the moment the checkpoint stops being a claim and becomes a demonstration.

Bulk-approve above a threshold matters too — a human does not click twenty-five times, and pretending otherwise makes the workflow unbelievable.

Sorting confidence-ascending is deliberate: it puts the reviewer's attention where it's needed instead of making them scroll past the obvious ones.

**Scope**

- `app/review/page.tsx`, `app/components/review/**`

**Done when**

- [ ] Approve, reject, and flip all work and persist
- [ ] Bulk approve above threshold works with a count shown
- [ ] Evidence quote is visible per row
- [ ] Rejections section shows validator reasons
- [ ] `decisions.json` records actor and timestamp

**Depends on:** the app shell in #24 and the fixture in #4.
