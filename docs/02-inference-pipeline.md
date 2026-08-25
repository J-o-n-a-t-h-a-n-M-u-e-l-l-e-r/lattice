# 02 · The inference pipeline

Fully automatic. Triggered by issue events or a schedule, it produces a DAG, persists it, and applies it to GitHub without asking anyone anything.

The guiding principle: *the correct answer for most pairs is no edge.* Every design choice below exists to fight the model's urge to find structure in topical similarity — because **there is no human gate downstream to catch it.**

```
trigger ──► L0 ingest ──► L1 given edges ──► L2 cluster (optional)
                                                    │
                                                    ▼
                                             L3 LLM extraction
                                                    │
                                       L4 validate ─┴─ L5 merge & score
                                                    │
                                          L6 make acyclic
                                                    │
                                                    ▼
                                        L7 persist the full graph
                                                    │
                                  ┌─────────────────┴─────────────────┐
                                  ▼                                   ▼
                            UI reads it                       MCP reads it
                     (reduced for display only)           (full graph, scheduled)
```

---

## L0 · Ingest

One paginated GraphQL query, 50 issues per page, fetching per issue:

`number`, `id` (node ID — needed for Copilot assignment), **`databaseId`** (the integer the REST `blocked_by` POST needs — **get it here, not with N extra calls**), `title`, `body`, `labels`, `milestone`, `assignees`, `state`, `parent` / `subIssues` (needs `GraphQL-Features: sub_issues`), and `timelineItems(itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT], first: 20)`.

Then one REST `GET .../dependencies/blocked_by` per issue to learn what is *already* recorded. Batch with concurrency 5.

Cache to the store, keyed by repo. **Never run a demo off a cold fetch.**

Truncate bodies to ~1500 chars for the LLM stage, but keep full text for evidence validation.

---

## L1 · Given edges — deterministic, API-sourced

Two sources, both structured data straight from GitHub. **No text parsing.**

| Source | Edge | Confidence | Notes |
|---|---|---|---|
| Existing native `blocked_by` | as recorded | `1.0`, `source: 'given'` | Ground truth. Never overwritten, never removed by the pipeline. |
| Sub-issue hierarchy | children block the parent's closure | `0.99`, `source: 'sub_issue'` | kept distinct from `blocked_by` |

Sub-issue edges are used by the scheduler but never written into `blocked_by` — GitHub already models hierarchy natively and duplicating it is noise. Saying this out loud in the demo shows we understand GitHub's data model rather than bulldozing it.

Given edges are also fed to the model as ground-truth context, so it doesn't spend output re-proposing what already exists.

> ### Deliberately not here: regex extraction of "depends on #123"
>
> An earlier design parsed directional phrases out of issue prose. **Cut.**
>
> Free-text dependency phrasing is inconsistent, and parsing it *well* means handling code fences, quoted text, negation, and ambiguous direction — a pile of brittle special cases for a signal the model already reads perfectly well. The model sees the same prose and reports it as an edge with the quote attached as evidence, which is strictly more useful than a regex hit.
>
> **Consequence, stated honestly:** the LLM is now load-bearing with no cheap fallback. On a repo with no pre-existing dependencies, L1 produces nothing and the graph is *entirely* inferred. That is a real reduction in robustness, bought for a large reduction in surface area. The mitigations are the response cache and the committed fixture snapshot — see [`08-risks.md`](08-risks.md).

---

## L2 · Clustering — optional, off by default

With `stealth/ox-alpha`'s 1M-token context the entire backlog fits in one call at any realistic size. 45 issues is roughly 30k tokens.

Clustering originally solved two problems; the big window kills one of them:

| Problem | Still real? |
|---|---|
| **Capacity** — the backlog doesn't fit | ❌ Gone |
| **Precision** — a model asked about 45 issues attends worse than one asked about 12 | ✅ Still real |

So `LATTICE_CLUSTER_SIZE` defaults to `0`, meaning one call. Set it to e.g. `14` to enable the clustered path: build a candidate graph from shared milestones, `area:*` labels, sub-issue trees and path/symbol overlap; partition it; give each issue membership in its top 2 clusters; add a representatives cluster to catch cross-cluster edges.

Measure both against the gold set and report which wins. One extra run, and a genuinely interesting result.

---

## L3 · LLM edge extraction

**Model: `stealth/ox-alpha` via OpenRouter.** Free, 1M context, OpenAI-compatible. Setup, limits and caveats in [`10-model-provider.md`](10-model-provider.md).

⚠️ **This model does not enforce JSON schemas.** Use forced tool-calling (`tool_choice` pinned to one `emit_edges` function), then **Zod-validate every response**, retrying once with the validation error fed back. Never `parse`, always `safeParse`.

### The system prompt

Keep it byte-stable — it makes the response cache key stable, and helps if the provider caches prefixes.

```
You extract BLOCKING DEPENDENCIES between software issues in one backlog.

A blocking dependency A -> B means: work on B cannot be COMPLETED, or would have
to be substantially redone, until A is done. It is a statement about engineering
necessity, not about topic similarity, team, priority, or narrative order.

Classify every edge you emit as exactly one of:
- hard_blocker: B's implementation is impossible until A exists.
  (A creates the table B queries; A adds the endpoint B calls.)
- data_contract: B consumes a type, schema, API shape or config key that A defines.
  Without A, B would be coding against a guess.
- shared_artifact: A and B modify the same file or module such that doing them
  concurrently produces a merge conflict or duplicated work. Order matters.
- ordering_preference: it is merely more pleasant to do A first. NOT a blocker.

DO NOT emit an edge when the only relationship is:
- same feature area, same milestone, same label, same author
- one issue merely MENTIONS the other
- both are "part of the auth work"
- one is a bug in code the other touches, unless the fix depends on the other landing

The correct answer for most pairs is NO EDGE. A backlog of 12 issues typically has
between 2 and 8 real blocking edges. If you emit more than 1.5x the number of
issues, you are pattern-matching on topic, not reasoning about necessity.

If an issue states its own dependencies in prose ("depends on #12", "after the
schema lands"), treat that as strong evidence and quote it.

RULES:
1. Only use issue numbers from the provided list. Never invent a number.
2. Every edge MUST include `evidence`: a VERBATIM span of <=160 chars copied
   character-for-character from the title or body of one of the two issues, which
   is the specific text that made you believe this. If you cannot copy such a span,
   do not emit the edge.
3. `confidence` is your probability the edge is real, honestly calibrated.
   Use the full range. Below 0.5 means "probably not".
4. Never emit both A->B and B->A. Pick the direction where the DEPENDENT work is
   the one that consumes the other's output. If genuinely bidirectional, the issues
   should be merged — emit nothing and note it in `notes`.
5. `effort_days` per issue: your estimate of implementation days (0.5, 1, 2, 3, 5).
```

Three lines carry most of the precision: the **operational test** (*"would have to be substantially redone"*, which turns vague relatedness into a falsifiable claim), the **density expectation** (*"typically between 2 and 8"*, a prior against over-generation), and the **prose-dependency instruction**, which is what now does the job the regex layer used to.

### Output schema

```ts
{
  edges: [{
    blocked: integer, blockedBy: integer,
    type: 'hard_blocker'|'data_contract'|'shared_artifact'|'ordering_preference',
    confidence: number,
    rationale: string,                          // <=200 chars
    evidence: { issue: integer, quote: string }
  }],
  estimates: [{ issue: integer, effort_days: number }],
  notes: string
}
```

---

## L4 · Validation — five guards

Zod catches malformed *shape*. These catch well-formed *nonsense*.

**These guards carry more weight than they did under the old design.** There is no human review downstream, so `validate.ts` is the only thing standing between a hallucinated edge and a `blocked_by` write on a real issue. Treat it as the safety-critical file it now is.

```ts
export function validateEdges(raw: RawEdge[], cluster: Issue[]) {
  const allowed = new Set(cluster.map(i => i.number));
  const text = new Map(cluster.map(i => [i.number, norm(i.title + '\n' + i.body)]));
  const kept: EdgeCandidate[] = [], rejected: Rejection[] = [];

  for (const e of raw) {
    // G1 — ID whitelist. The model may only reference issues it was shown.
    if (!allowed.has(e.blocked) || !allowed.has(e.blockedBy) || e.blocked === e.blockedBy) {
      rejected.push({ e, reason: 'unknown_or_self_id' }); continue;
    }
    // G2 — evidence must be a real substring of the cited issue.
    const hay = text.get(e.evidence.issue) ?? '';
    if (!hay.includes(norm(e.evidence.quote))) {
      if (tokenOverlap(norm(e.evidence.quote), hay) >= 0.85) e.confidence -= 0.25;
      else { rejected.push({ e, reason: 'fabricated_evidence' }); continue; }
    }
    // G3 — soft edges are stored and drawn, but never block.
    if (e.type === 'ordering_preference') e.blocking = false;
    // G4 — given edges win. The model cannot contradict what GitHub already records.
    if (given.hasReverse(e)) { rejected.push({ e, reason: 'contradicts_given' }); continue; }
    kept.push(e);
  }

  // G5 — density cap. Keep the top 1.5 * |cluster| by confidence.
  kept.sort((a, b) => b.confidence - a.confidence);
  const cap = Math.ceil(cluster.length * 1.5);
  rejected.push(...kept.slice(cap).map(e => ({ e, reason: 'density_cap' })));
  return { kept: kept.slice(0, cap), rejected };
}
```

Every rejection is persisted with its reason. Surface the counts on the run:

> `1 request · 31 edges proposed · 3 rejected (1 fabricated evidence, 2 density cap) · 0 hallucinated IDs`

---

## L5 · Merge & scoring

```ts
score = 1 - Π(1 - cᵢ)                                  // independent evidence
if (distinctLayers >= 2) score = min(0.99, score + 0.05);
if (reverseExists)       { score = max(score, reverse.score) - 0.15; flag('contested'); }
```

### The blocking threshold

**Every edge is stored, whatever its score.** The threshold decides only whether an edge is treated as *blocking* when the schedule is computed:

| Score | What happens |
|---|---|
| `>= LATTICE_BLOCK_THRESHOLD` (default **0.80**) | Treated as a real blocker — constrains waves, critical path and the ready set |
| below it | Stored and displayed, but does not block anything |
| `contested` | Stored, never blocking |

Keeping the low-confidence edges rather than discarding them matters: they are visible in the UI as weak signals, they feed the quality metrics against the gold set, and a later run with better evidence can promote one without having to rediscover it.

Nothing here is destructive, which is what makes an unsupervised threshold safe to get slightly wrong. A bad edge above the line mis-orders our own suggestions until the next run; it does not modify anyone's repo.

---

## L6 · Make acyclic

Fully automatic — see [`03-graph-scheduling.md`](03-graph-scheduling.md#cycle-detection-and-breaking). The lowest-weight edge on each cycle is dropped, `given` edges are never touched, and every break is recorded with what was cut and what the alternatives were.

Cycle breaking **is** persisted: a cut edge is genuinely removed from the graph, because everything downstream is undefined on a cyclic graph.

> ### Transitive reduction is a view, not a stored form
>
> If A→B, B→C and A→C, then A→C is redundant *for drawing purposes* — it adds an arrow that clutters the picture and tells the reader nothing new.
>
> **Compute it in the UI at render time. Do not store the reduced graph, and do not let the scheduler see it.**
>
> The reduction is lossy. A→C carries its own rationale, evidence, confidence and provenance, and it may well have come from a different source than the two-hop path. Persisting the reduced form would silently destroy that, and `explain_dependency` on A→C would then have nothing to return.
>
> It is also cheap enough that there's no reason to precompute — one pass over the edge list. Treat it exactly like a layout choice, alongside which nodes are visible and how the columns are laid out.

---

## L7 · Persist

The full graph goes into the store: every edge the pipeline has an opinion about, above and below the threshold, with its type, confidence, source, rationale and evidence — plus the rejections, the cycle breaks, and the derived schedule. See [`11-graph-store.md`](11-graph-store.md).

> ### Lattice does not write to GitHub
>
> **The graph is stored in the database only.** No `blocked_by` writes, no dependency deletions, no comments. GitHub is a **read source**, not a write target.
>
> That makes the whole system **non-destructive by construction**, which is what earns it the right to run unsupervised. There is no automatic writer that could corrupt a shared repo, no pruning logic that could delete a dependency a human recorded, no secondary rate limit to dance around, and no write permissions to request. The worst a bad inference can do is mis-order our own suggestions until the next run.
>
> GitHub's native `blocked_by` and sub-issue hierarchy are still read every run as `given` edges — ground truth the model may not contradict (see [L1](#l1--given-edges--deterministic-api-sourced)). Anyone who wants to overrule Lattice edits `blocked_by` on GitHub and the next run treats it as fact. **That is the write path: humans write, Lattice reads.**
>
> **What this costs, stated plainly:** the graph only exists where Lattice is running. It is not visible in GitHub's own UI, and other tools don't inherit it. The mitigation is that everything is genuinely retrievable — a deployed interactive graph anyone can open and click into, and the `explain_dependency` MCP tool for agents.

---

## Triggering

The pipeline is not a button. It runs on:

| Trigger | Why |
|---|---|
| `issues` events — opened, edited, closed, reopened, labeled | The backlog changed. Debounce so an editing spree is one run. |
| Hourly schedule | Backstop for missed or dropped events. |
| `workflow_dispatch` | Manual re-run, for the demo. |
| `report_progress` from an agent | A completion changes the ready set immediately. |

**Incremental where possible.** If one issue changed, re-infer only the clusters containing it and re-run the graph maths, which is cheap and needs no model call. Full re-inference is the fallback, not the default — it is also what protects the daily request quota.

Every run is recorded in the store with its trigger, request count, edge counts and duration. See [`11-graph-store.md`](11-graph-store.md).
