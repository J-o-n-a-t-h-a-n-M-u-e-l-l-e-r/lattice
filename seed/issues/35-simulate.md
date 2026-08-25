# [M] `simulate_completion`
<!-- labels: lane:mcp,size:S -->
**What**

`simulate_completion({ numbers })` — mark those issues closed in memory, recompute, and return what becomes ready, the new critical path, days saved, and max parallelism after.

**Why it matters**

About twenty lines, since it reuses the wave function with a modified closed-set, and it answers a question people genuinely ask: *"if we finish these two today, what opens up tomorrow?"*

Good demo line, and a good argument that the graph is a planning instrument rather than a picture. It's also the most obviously useful thing for a human planning a sprint, which is worth having given the adjacent "AI sprint planner" idea on the hackathon board.

**Scope**

- `src/lib/mcp/tools/simulate.ts`

**Done when**

- [ ] Returns correct newly-ready sets for a known fixture
- [ ] Does not mutate real state
- [ ] Reports days saved against the current critical path

**Depends on:** the schedule computations in #19 and #20.
