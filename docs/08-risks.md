# 08 · Risks and honest weaknesses

Put a **"What this doesn't do yet"** section in the README. The judges said unfinished isn't disqualifying if the thinking is clear, and that *"honesty scores well"*. A candid limitations section converts a weakness into evidence of judgement.

---

## The twelve

> The first two changed materially when the human approval gate was removed. Read them as a pair.


1. **LLM-inferred edges are opinions, not facts — and they are now written without review.** This is the biggest risk in the project and it went up when we removed the approval gate.
   *Mitigation, in layers:* **nothing is written to GitHub**, so a wrong edge cannot corrupt the repo — it only mis-orders our own suggestions until the next run; typed edges; a verbatim-evidence requirement checked against source text; a blocking threshold, so low-confidence edges are stored and shown but constrain nothing; `given` edges immutable; and a per-run rejection log. Say this in the README's first section rather than burying it.

2. **No cheap fallback since the regex layer was cut.** On a repo with no pre-existing `blocked_by`, L1 produces nothing and the graph is entirely model-inferred.
   *Mitigation:* the response cache and the committed fixture snapshot. Accept that `--no-llm` is now a near-empty graph rather than a degraded one, and say so.

3. **No ground truth → unverifiable quality claims.**
   *Mitigation:* hand-label ~40 candidate pairs from the dogfood corpus (about 30 minutes) and report precision@0.85 and recall. Almost nobody else will have a number.

4. **Dogfooding is circular.** Of course it works on issues we wrote knowing the tool existed.
   *Mitigation:* also run read-only against a real public backlog and screenshot that graph. Twenty minutes, and it kills the objection a sharp judge *will* raise.

5. **Cycle breaking is a heuristic** and now runs unsupervised. It is also the one genuinely destructive step, since a cut edge leaves the graph.
   *Mitigation:* `given` edges are immutable, so it can only ever cut something the model inferred, and the effect is contained to our own store. Every break records the cycle, the victim and the alternatives. README names the algorithm and calls it greedy weighted feedback-arc-set.

6. **Effort estimates are LLM guesses**, so the critical path's *day count* is soft even though its *shape* is sound.
   *Mitigation:* prefer `size:*` labels where present; present the critical path as an ordering with an indicative duration, never as a date.

7. **The graph is invisible outside Lattice.** Because we never write to GitHub, the dependency information doesn't appear in GitHub's UI and other tools don't inherit it.
   *Mitigation:* a deliberate trade for being non-destructive — say so rather than apologising for it. The graph is genuinely retrievable: a deployed interactive app anyone can open, and `explain_dependency` over MCP for agents. A team that wants the edges in GitHub writes them by hand, and Lattice picks them up as immutable ground truth.

8. **Copilot latency** — PRs take minutes.
   *Mitigation:* start the run before presenting; show one in flight and one already open.

9. **Branch stacking creates rebase pain** on squash-merge.
   *Mitigation:* `wait` is the default policy; stack one level only; demo it once and name the cost out loud.

10. **"GitHub will just build this."**
   *Mitigation:* lead with *the scheduler for agents*, not the picture. GitHub shipped the dependency *fields* and still has no graph view, no inference, and nothing that tells an agent what to work on next. The visualisation is the surface; the schedule is the product.

11. **We depend on an anonymous stealth model.** Ox Alpha is a preview and can vanish without notice; its provider is unnamed and retains prompts (though not for training).
    *Mitigation:* the entire model layer sits behind one file and one env var, so switching providers is minutes. Say the privacy position out loud in the README — our backlog is public, so it costs us nothing, but anyone pointing Lattice at a private backlog is sending issue text to a third party. Naming that is evidence of judgement, not a weakness.

12. **A judge can't run it.**
    *Mitigation:* `DEMO_MODE=1` with a committed fixture snapshot — no GitHub token, no Copilot seat, no OpenRouter key, and they still see the whole app. **This is the single highest-ROI hour in the plan** and it maps directly onto the "Craft" criterion.

---

## Fallback matrix

| If this fails | Fall back to | Cost |
|---|---|---|
| LLM layer slow / expensive / noisy | The response cache, then the committed fixture. Deterministic edges alone are near-empty on a fresh repo. | 0 |
| Model returns malformed / off-schema JSON | Expected — Ox Alpha does not enforce schemas. Zod `safeParse` + one retry with the error fed back; drop the cluster on a second failure | 0 — designed in |
| **Ox Alpha withdrawn** (stealth preview, no stability guarantee) | Swap `LATTICE_MODEL` to any OpenAI-compatible OpenRouter model. The forced-tool + Zod path works on both | minutes |
| **OpenRouter 429 / daily quota exhausted** | `--no-llm` or `DEMO_MODE=1`; disk cache means re-runs cost nothing | 0 — if the cache exists |
| dagre layout looks bad | Swap in elkjs behind the same `nodes + edges → positions` interface | ~20 min |
| Copilot dispatch fails at demo time | Dry-run payload view + `scripts/agent.ts` local MCP agent | 0 — built earlier |
| Copilot can't reach the MCP server (no OAuth, secret naming, tunnel) | Demo MCP through Claude Code or MCP Inspector — same server, same tools | 0 |
| A teammate is lost for a day | The Day-1 path alone is a submission | — |

Notice how many of these cost zero: that's deliberate. **The fallback is usually a thing we built early for development reasons anyway.** Where that's true, build the fallback first.

---

## Scale — say it, don't build it

25 issues means 625 possible pairs, trivially one context window. The clustering in [`02-inference-pipeline.md`](02-inference-pipeline.md) handles a few hundred.

For thousands: embed and cluster, infer densely within clusters and sparsely between cluster representatives, and use the Batch API. **Describe this in the README as a known limit.** A stated boundary reads as engineering judgement; a hidden one reads as a bug waiting for a judge to find it.
