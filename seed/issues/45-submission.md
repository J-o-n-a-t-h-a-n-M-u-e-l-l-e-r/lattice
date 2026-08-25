# [X] File the hackathon submission issue
<!-- labels: lane:demo,size:S -->
**What**

Open the submission issue on `reneexeener/msft-hackathon-2026` using the `2-project-submission.yml` template. Required fields: team, members, the linked idea issue, what it does, code repo, demo link, how agents did the work, how we planned and tracked it, and what surprised us. Plus four checkboxes.

**Why it matters**

Two of those fields are scored free-text and are much easier to write from notes than from memory at hour 17:

- **`how_we_collaborated`** is explicitly marked *"Show your working — this is scored."* Our answer is unusually strong: we dogfooded, so our own board, our own dependency graph, and the committed `decisions.json` record of a human overruling a model *are* the evidence. Link them.
- **`learned`** — the criteria say honesty scores well. Write down what actually went wrong.

Keep a running notes file from hour one. Also worth one sentence: how we differ from the `/split` example on the board — decomposition creates hierarchy, we create the blocking relation and the schedule that falls out of it.

**Scope**

- The submission issue; `NOTES.md` in this repo

**Done when**

- [ ] Idea issue is linked
- [ ] Repo is public and the demo link works externally
- [ ] `how_we_collaborated` links the board, the graph, and `decisions.json`
- [ ] `learned` names at least two real failures
- [ ] All four checkboxes honestly checked

**Depends on:** the recorded demo in #44 and the README in #43.
