# 03 · Graph algorithms & scheduling

Everything here lives in `src/graph/**` and is **pure** — no I/O, no network, no `process.env`. These are the parts we unit-test and the parts we explain out loud.

At our scale every algorithm below is exact. No approximation is needed except where explicitly noted (cycle breaking, which is NP-hard).

---

## Cycle detection and breaking — the DAG guarantee

Topological scheduling is undefined on a cyclic graph, so this is **load-bearing, not polish**. Build it early.

An LLM asked for pairwise relations *will* produce `A → B → C → A`. So will a room full of humans. Since there is no review gate, the pipeline has to resolve this on its own, every time, without supervision.

```ts
const IMMUTABLE = Infinity;

function weight(e: EdgeCandidate): number {
  if (e.source === 'given')     return IMMUTABLE;   // already in GitHub — never cut
  if (e.pinned)                 return IMMUTABLE;   // a human nudged it in
  if (e.source === 'sub_issue') return 1000;        // native hierarchy, near-immutable
  if (e.type === 'ordering_preference') return e.confidence * 0.5;  // cheapest to cut
  return e.confidence * 10;                         // inferred: cut by confidence
}

export function makeAcyclic(edges: Edge[]): { dag: Edge[]; breaks: CycleBreak[] } {
  const breaks: CycleBreak[] = [];
  let cur = [...edges];

  for (;;) {
    const comps = tarjanSCC(cur).filter(c => c.length > 1);
    if (comps.length === 0) break;

    for (const comp of comps) {
      const inSet = new Set(comp);
      // Every edge internal to an SCC lies on some cycle.
      const internal = cur.filter(e => inSet.has(e.blocked) && inSet.has(e.blockedBy));
      const victim = internal.reduce((a, b) => weight(b) < weight(a) ? b : a);

      if (weight(victim) === IMMUTABLE) {
        // Every edge here is `given` — recorded in GitHub by a human or another
        // tool. Cutting one would overwrite their data, so we drop the component
        // from scheduling instead and flag it. GitHub is left untouched.
        breaks.push({ cycle: shortestCycleThrough(internal, comp), victim: null,
                      reason: 'unresolvable_given_cycle' });
        cur = cur.filter(e => !(inSet.has(e.blocked) && inSet.has(e.blockedBy)));
        continue;
      }

      breaks.push({
        cycle: shortestCycleThrough(internal, comp),   // recorded: 12 -> 19 -> 23 -> 12
        victim,                                        // cut automatically
        alternatives: internal.filter(e => e !== victim)
                              .sort((a, b) => weight(a) - weight(b)).slice(0, 3),
        reason: 'lowest_weight_arc_on_cycle',
      });
      cur = cur.filter(e => e !== victim);
    }
  }

  // HARD ASSERTION — never emit a non-DAG.
  const order = kahn(cur);
  if (order.length !== nodeCount(cur)) {
    throw new Error('INVARIANT: graph still cyclic after feedback-arc-set removal');
  }
  return { dag: cur, breaks };
}
```

### Four design points worth stating in the demo

1. **Minimum feedback arc set is NP-hard.** This is a greedy weighted heuristic and the README says so. Honesty scores.
2. **This is fully automatic. Nothing escalates to a human.** Each break is *recorded* — the actual cycle (`#12 → #19 → #23 → #12`), the chosen victim, and the top alternatives — and the pipeline continues. The record is for explaining afterwards, not for approving beforehand.

   The weighting is what makes that safe: `given` edges (already recorded in GitHub) are immutable, so the algorithm can only ever cut something the model inferred. **The worst case is that we mis-order our own suggestions and the next run corrects it.**
3. **All-immutable cycles.** If every edge in a cycle is `given`, the pipeline cannot cut anything without overwriting human data. It drops the whole component from the *scheduling* graph, marks those issues unschedulable with `reason: 'unresolvable_given_cycle'`, and leaves GitHub untouched. Surface it in the UI as a warning; do not guess.
4. **Handle GitHub's own rejection.** If `POST blocked_by` returns 422 because GitHub detects a cycle against edges already in the repo, record `github_rejected_cycle` and continue the batch. Don't crash.
5. **Eades–Lin–Smyth** (compute a vertex order, delete back-edges) is ~40 lines and beats greedy globally. Build greedy first — it's easier to narrate. ELS only if there's spare time.

---

## Waves — topological levels

```
wave(v) = 0                            if v has no OPEN blockers
        = 1 + max(wave(blockers))      otherwise
```

Computed over **open issues only**, so closed blockers vanish and the graph is live. Kahn's algorithm, grouped by level.

**Wave 0 is the parallelizable frontier.** It is the number that matters, and it's the answer to "what can we start right now?"

---

## Critical path

Node-weighted longest path. `effort_days` comes from, in priority order:

1. a `size:*` label on the issue
2. the LLM's `effort_days` estimate
3. `1.0`

Forward pass for earliest start/finish, backward pass for latest start/finish, then `slack = LS − ES`. The **critical path is the zero-slack chain**.

Report its length as:

> **"Minimum wall-clock to finish this milestone, assuming infinite parallelism."**

That single sentence is the most business-legible output the tool produces. Note the honest caveat in [`08-risks.md`](08-risks.md): the *shape* of the critical path is sound, the *day count* is soft because effort estimates are guesses.

---

## Blast radius

The size of the transitive set an issue unblocks. Reverse-topological DP with `Uint32Array` bitsets — exact, and instant below ~2000 nodes.

```ts
const W = Math.ceil(n / 32);
const reach = new Uint32Array(n * W);
for (const v of reverseTopoOrder) {
  for (const d of dependents[v]) {
    for (let w = 0; w < W; w++) reach[v * W + w] |= reach[d * W + w];
    reach[v * W + (d >> 5)] |= 1 << (d & 31);
  }
}
const blastRadius = (v: number) => popcountRange(reach, v * W, W);
```

---

## "What to work on next"

Keep it **explainable**. A weighted score with tuned coefficients is unconvincing and unauditable.

```
sort by:  ready (wave === 0)  desc
          onCriticalPath      desc
          blastRadius         desc
          slack               asc
          effort_days         asc
```

Every row in the UI shows its reason in words: *"Ready · on critical path · unblocks 7."*

**Never show a bare score.** The explanation is the product.

---

## Conflict risk

Reuses the IDF-weighted path/symbol inverted index built in L1 of the inference pipeline:

```
conflict(a, b) = IDF-weighted Jaccard of extracted paths and symbols
```

Two ready issues with `conflict > 0.4` should not be dispatched to agents in the same wave. This is the bridge between the graph work and the Copilot work, and it's about fifteen lines.

---

## Mermaid emitter — build this early

`src/graph/mermaid.ts` is twenty lines and pays for itself three times over:

1. It gives a working "visualization" checkpoint in hour two, before React Flow exists.
2. It's the fallback if React Flow layout goes sideways.
3. **GitHub renders Mermaid natively in issue bodies** — so we can post the current DAG into a tracking issue. *"The graph lives in GitHub too"* is a free extra demo beat.

```ts
export function toMermaid(g: Graph): string {
  const L = ['flowchart LR'];
  for (const w of g.waves) L.push(`  subgraph W${w.index}["Wave ${w.index}"]\n    direction TB`);
  // nodes:  N12["#12 Tarjan SCC<br/>unblocks 7"]
  // classDef critical stroke:#f00,stroke-width:3px
  for (const e of g.edges) L.push(`  N${e.blockedBy} --> N${e.blocked}`);
  return L.join('\n');
}
```

---

## Tests

These are cheap and they are the ones that matter:

- **Known DAG** → assert wave membership, critical path, blast radius.
- **Planted cycle** → assert it is broken at the lowest-weight edge and reported in `breaks`.
- **Diamond** `A→B, A→C, B→D, C→D` → assert transitive reduction leaves it intact (nothing to remove).
- **All-`given` cycle** → assert `reason: 'unresolvable_given_cycle'`, that no edge was cut, and that the component is excluded from scheduling rather than silently mangled.
