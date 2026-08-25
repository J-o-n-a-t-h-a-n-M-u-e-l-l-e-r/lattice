# 08 · Risks and honest weaknesses

Put a **"What this doesn't do yet"** section in the README. The judges said unfinished isn't disqualifying if the thinking is clear, and that *"honesty scores well"*. A candid limitations section converts a weakness into evidence of judgement.

---

## The ten

1. **LLM-inferred edges are opinions, not facts.**
   *Mitigation:* typed edges, verbatim-evidence requirement, confidence bands, mandatory human gate, committed rejection log. Say it in the README's first paragraph rather than burying it.

2. **No ground truth → unverifiable quality claims.**
   *Mitigation:* hand-label ~40 candidate pairs from the dogfood corpus (about 30 minutes) and report precision@0.85 and recall. Almost nobody else will have a number.

3. **Dogfooding is circular.** Of course it works on issues we wrote knowing the tool existed.
   *Mitigation:* also run read-only against a real public backlog and screenshot that graph. Twenty minutes, and it kills the objection a sharp judge *will* raise.

4. **Cycle breaking is a heuristic** and can cut the wrong edge.
   *Mitigation:* the human resolver with alternatives; README names the algorithm and calls it greedy weighted feedback-arc-set.

5. **Effort estimates are LLM guesses**, so the critical path's *day count* is soft even though its *shape* is sound.
   *Mitigation:* prefer `size:*` labels where present; present the critical path as an ordering with an indicative duration, never as a date.

6. **Secondary rate limits mid-demo.**
   *Mitigation:* do the bulk write-back before the demo and show a delta; 1.2s spacing between writes; everything reads from `.lattice/raw.json`.

7. **Copilot latency** — PRs take minutes.
   *Mitigation:* start the run before presenting; show one in flight and one already open.

8. **Branch stacking creates rebase pain** on squash-merge.
   *Mitigation:* `wait` is the default policy; stack one level only; demo it once and name the cost out loud.

9. **"GitHub will just build this."**
   *Mitigation:* don't lead with the visualization. Lead with *the scheduler for agents*. The viz is a consequence, not the product.

10. **A judge can't run it.**
    *Mitigation:* `DEMO_MODE=1` with a committed fixture snapshot — no GitHub token, no Copilot seat, no Anthropic key, and they still see the whole app. **This is the single highest-ROI hour in the plan** and it maps directly onto the "Craft" criterion.

---

## Fallback matrix

| If this fails | Fall back to | Cost |
|---|---|---|
| LLM layer slow / expensive / noisy | `--no-llm`. The seeded corpus has enough explicit refs to render a real graph. | 0 — built in the first block |
| Structured-output SDK binding fights you | A strict tool-use tool (`strict: true`, `additionalProperties: false`) — same schema, different transport | 20 min |
| React Flow layout ugly | Render `mermaid.ts` output client-side with the `mermaid` package | 0 — built in the first block |
| `blocked_by` POST forbidden (perms / preview) | (a) `--dry-run` prints exact calls; (b) post the Mermaid DAG plus a blocked-by task list into a tracking issue; (c) shell out to `gh` **only after upgrading to ≥ 2.94** | 30 min |
| Copilot dispatch fails at demo time | Dry-run payload view + `scripts/agent.ts` local MCP agent | 0 — built earlier |
| Copilot can't reach the MCP server (no OAuth, secret naming, tunnel) | Demo MCP through Claude Code or MCP Inspector — same server, same tools | 0 |
| A teammate is lost for a day | The Day-1 path alone is a submission | — |

Notice how many of these cost zero: that's deliberate. **The fallback is usually a thing we built early for development reasons anyway.** Where that's true, build the fallback first.

---

## Scale — say it, don't build it

25 issues means 625 possible pairs, trivially one context window. The clustering in [`02-inference-pipeline.md`](02-inference-pipeline.md) handles a few hundred.

For thousands: embed and cluster, infer densely within clusters and sparsely between cluster representatives, and use the Batch API. **Describe this in the README as a known limit.** A stated boundary reads as engineering judgement; a hidden one reads as a bug waiting for a judge to find it.
