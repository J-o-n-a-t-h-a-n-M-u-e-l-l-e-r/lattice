# [X] The README — this one is scored
<!-- labels: lane:demo,size:M -->
**What**

Rewrite the README as the thing a judge actually reads: the pitch in three sentences, a quickstart that gets from clone to graph in five commands or fewer with `DEMO_MODE=1` first, an architecture diagram, the measured precision numbers, and an explicit **"What this doesn't do yet"** section.

**Why it matters**

*"Can someone else run it from your README?"* is a stated judging criterion, which makes this a feature and not documentation debt. Budget real time for it rather than writing it at hour 17.

The limitations section is not a confession, it's a differentiator. The criteria say unfinished isn't disqualifying if the thinking is clear, and *"honesty scores well"*. Naming the known limits — LLM edges are opinions, effort estimates are soft, cycle breaking is a greedy heuristic, dogfooding is circular — reads as judgement. Hiding them reads as a bug waiting for a judge to find.

Include the scale story: what we tested, what the clustering handles, and what we'd do for thousands of issues. A stated boundary is worth more than a vague claim.

**Scope**

- `README.md`

**Done when**

- [ ] A stranger can run it from the README with no tokens
- [ ] Real precision numbers appear, with failure cases
- [ ] "What this doesn't do yet" is present and specific
- [ ] The architecture diagram matches what was actually built

**Depends on:** `DEMO_MODE` in #41 for the quickstart, and the measurements in #42.
