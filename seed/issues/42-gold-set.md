# [X] Gold-set labelling and precision/recall
<!-- labels: lane:demo,size:M -->
**What**

Hand-label roughly 40 candidate pairs from our own backlog as true or false dependencies, then measure the pipeline against them: precision at the 0.85 threshold, recall, and where it fails. Put the real numbers in the README, including the misses.

**Why it matters**

About thirty minutes of work for the most credible thing in the submission. Almost every hackathon project claims its inference works; almost none report a number.

Reporting the misses matters as much as the hits. The criteria say plainly that honesty scores well, and a stated precision figure with named failure cases reads as engineering judgement — where an unqualified "it works" reads as a claim nobody checked.

We have an unusual advantage here: we wrote this backlog, so we actually know the true ordering. Use it.

Pair this with a read-only run against a **real public repo's backlog**, screenshotted. That kills the obvious objection that we only tested on issues we wrote knowing the tool existed.

**Scope**

- `seed/gold-set.json`, `scripts/evaluate.ts`, README results section

**Done when**

- [ ] ~40 pairs labelled with rationale
- [ ] Precision and recall computed and reported
- [ ] At least two failure cases described in the README
- [ ] A public-repo run is screenshotted

**Depends on:** the full pipeline in #16.
