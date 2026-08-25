# [U] Wire approvals to the write-back path
<!-- labels: lane:ui,size:M -->
**What**

`app/api/approve/route.ts` — take approved edges from the review queue, call the GitHub write path, stream progress back to the UI, and surface per-edge results including failures.

**Why it matters**

This is the join between the two halves of the project and the 0:55 beat of the demo: click approve, refresh github.com, and the native "Blocked by" section is populated with a receipt comment underneath.

Progress streaming is not cosmetic here. Writes are deliberately spaced ~1.2s apart to stay under the secondary rate limit, so applying twenty edges takes half a minute. Without progress feedback that reads as a hang.

Failures must be visible per edge rather than collapsing the whole run — a 422 on one edge (usually GitHub detecting a cycle against pre-existing data) should not hide the nineteen that succeeded.

**Scope**

- `app/api/approve/route.ts`, review page wiring

**Done when**

- [ ] Approved edges reach GitHub
- [ ] Per-edge progress and failures are shown
- [ ] `--dry-run` equivalent is reachable from the UI
- [ ] Rate-limit spacing does not read as a hang

**Depends on:** the review queue in #27 and the write-back path in #7.
