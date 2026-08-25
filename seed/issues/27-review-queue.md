# [U] ~~`/review` — the human approval queue~~ (superseded)
<!-- labels: lane:ui,size:L -->
**This issue is obsolete. Do not implement it.**

The original plan had every inferred edge reviewed and approved by a human before it reached GitHub.

**Cut — there is no human in the loop.** The pipeline runs unsupervised on issue events and a schedule. A scheduler that stops for a human on every edge isn't a scheduler.

What replaced it:

- **The blocking threshold** (`LATTICE_BLOCK_THRESHOLD`, default 0.80) — high-confidence edges constrain the schedule, lower-confidence ones are stored and shown but block nothing. Policy instead of a queue. Speculative ones stay in the store and only schedule internally. Policy instead of a queue. See `docs/02-inference-pipeline.md#l5-merge--scoring`.
- **`/runs`** (#49) — the accountability surface. What each run did, what the validators rejected and why, which cycles were cut, what fell below threshold. Read-only.
- **Human nudges** (#50, low priority) — pin and suppress, applied *after* the fact rather than as a gate.
