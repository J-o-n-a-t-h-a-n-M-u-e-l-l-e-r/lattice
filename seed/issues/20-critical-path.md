# [S] Critical path and slack
<!-- labels: lane:graph,size:M -->
**What**

Node-weighted longest path. `effort_days` resolved in priority order: a `size:*` label, then the LLM's estimate, then 1.0. Forward pass for earliest start/finish, backward pass for latest start/finish, `slack = LS − ES`. The critical path is the zero-slack chain.

**Why it matters**

Report its length as *"minimum wall-clock to finish this milestone, assuming infinite parallelism"*. That is the most business-legible output the tool produces, and it's the sentence that makes a non-engineer care.

Be honest about the caveat, in the UI and the README: the *shape* of the critical path is sound because it comes from the graph, but the *day count* is soft because effort estimates are LLM guesses. Prefer `size:*` labels wherever they exist, and present the result as an ordering with an indicative duration — never as a date.

**Scope**

- `src/graph/schedule.ts`

**Done when**

- [ ] Correct critical path on a fixture with known answer
- [ ] `size:*` labels take precedence over model estimates
- [ ] Slack computed for every node
- [ ] Total duration exposed for the UI headline

**Depends on:** the wave computation in #19, which establishes the topological order both passes need.
