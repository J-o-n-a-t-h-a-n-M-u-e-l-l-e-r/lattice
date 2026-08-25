# 02 · The inference pipeline

Five layers. Cheap and certain first. Each layer emits `EdgeCandidate` objects into a common bag; **nothing is an edge until merge + validate**.

The guiding principle: *the correct answer for most pairs is no edge.* Every design choice below exists to fight the model's urge to find structure in topical similarity.

---

## L0 · Ingest

One paginated GraphQL query, 50 issues per page, fetching per issue:

`number`, `id` (node ID — needed for Copilot assignment), **`databaseId`** (the integer the REST `blocked_by` POST needs — **get it here, not with N extra calls**), `title`, `body`, `labels`, `milestone`, `assignees`, `state`, `parent` / `subIssues` (needs `GraphQL-Features: sub_issues`), and `timelineItems(itemTypes: [CROSS_REFERENCED_EVENT, CONNECTED_EVENT], first: 20)`.

Then one REST `GET .../dependencies/blocked_by` per issue to learn what's *already* recorded. At 30 issues that's 30 calls — batch with concurrency 5.

Cache everything to `.lattice/raw.json` behind a `--cached` flag. **Never demo off a live cold fetch.**

Truncate bodies to ~1500 chars for the LLM stage, but keep full text for regex matching and evidence validation.

---

## L1 · Deterministic extractors

No LLM. High precision. Runs first and always — this is what makes the graph work even if the model is unavailable.

```ts
const DIRECTIONAL = [
  // group 2 = ref  →  THIS issue is blocked BY ref
  { re: /\b(?:blocked\s+by|depends\s+on|requires|needs|waiting\s+on|after|prereq(?:uisite)?s?:?|built\s+on(?:\s+top\s+of)?)\b[^\n]{0,40}?(#(\d+))/gi,
    dir: 'blockedBy' },
  // THIS issue blocks ref
  { re: /\b(?:blocks|unblocks|prerequisite\s+for|must\s+land\s+before|enables)\b[^\n]{0,40}?(#(\d+))/gi,
    dir: 'blocks' },
];
// confidence 0.95, source 'explicit_text'
// evidence = the matched sentence, trimmed to 160 chars
// GUARD: reject matches inside a code fence or a blockquote of someone else's text
```

**Sub-issue hierarchy** → children block the parent's closure. Confidence 0.99, `source: 'sub_issue'` — but flagged **`writeBack: false`**. GitHub already models this natively; duplicating it into `blocked_by` is noise. We *use* it in the scheduler, we don't write it. Saying this out loud in the demo shows we understand GitHub's data model rather than bulldozing it.

### Three important non-edges from L1

These feed candidate generation instead:

- **Bare `#123`** with no directional phrase → **not an edge**. A mention is not a dependency. Emitted as a *candidate pair* for L3.
- **Shared milestone or `area:*` label** → cluster key, not an edge.
- **Path & symbol extraction** → pull `src/foo/bar.ts`, `packages/x`, and backticked identifiers containing `/` or `.` from title + body. Build an IDF-weighted inverted index. Shared rare token → candidate pair.

That inverted index is reused later for **agent conflict risk** (see [`05-copilot-dispatch.md`](05-copilot-dispatch.md)), so it earns its keep twice.

The trick worth naming: **cheap signals do double duty as candidate generation.**

---

## L2 · Candidate generation & clustering — the O(n²) answer

Never ask the model about all pairs. Never ask it about a *single* pair either — N² LLM calls is the same problem wearing a hat. **Ask about clusters.**

```
candidates = union(
  bare cross-reference pairs,                 // highest prior
  same-milestone pairs (cap 40 per milestone),
  same area:* label pairs (cap 40 per label),
  top-6 embedding neighbours per issue,       // one batched embedding call over n
  IDF-weighted path/symbol overlap pairs (> 0.25),
  all pairs within one sub-issue tree
)  →  dedupe, cap at 6n
```

Build the **candidate graph** (undirected, weighted by how many signals fired), partition with greedy modularity or connected components, and split any component larger than 14 issues.

Two refinements that matter:

- **Each issue joins its top 2 clusters** — overlapping windows, so cluster boundaries get double coverage.
- **Add a "representatives" cluster**: the 2 highest-degree issues from each cluster, capped at 14. This is what catches genuine cross-cluster edges.

### Cost model — put these numbers in the README

| Backlog size | LLM calls | Wall clock (concurrency 5) |
|---|---|---|
| n = 30 | ~5 | seconds |
| n = 200 | ~32 | ~50s |

Measured scale claims are rare in hackathon submissions and judges notice. For n > 300, the Batch API halves cost — mention as future work, don't build it.

---

## L3 · LLM edge extraction

**Model: `claude-opus-5`** with adaptive thinking and `effort: "medium"`. Adaptive thinking is what makes it reason about *directionality* instead of pattern-matching. If latency hurts the demo, drop to `effort: "low"` — **do not downgrade the model.**

Structured output via JSON schema. ⚠️ Verify the exact SDK binding against the `claude-api` skill before writing this — the API changed and `output_format` is deprecated in favour of `output_config: { format: {...} }`.

### The system prompt

Keep it **byte-stable** so the prefix caches across every cluster call. The per-cluster issue list goes in the user turn, after the cache breakpoint.

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

RULES:
1. Only use issue numbers from the provided list. Never invent a number.
2. Every edge MUST include `evidence`: a VERBATIM span of <=160 chars copied
   character-for-character from the title or body of one of the two issues, which
   is the specific text that made you believe this. If you cannot copy such a span,
   do not emit the edge.
3. `confidence` is your probability the edge is real, honestly calibrated.
   Use the full range. Below 0.5 means "probably not, but worth a human glance."
4. Never emit both A->B and B->A. Pick the direction where the DEPENDENT work is
   the one that consumes the other's output. If genuinely bidirectional, the issues
   should be merged — emit nothing and note it in `notes`.
5. `effort_days` per issue: your estimate of implementation days (0.5, 1, 2, 3, 5).
```

The two sentences doing most of the work are the **operational test** in paragraph two (*"would have to be substantially redone"* — it converts vague relatedness into a falsifiable claim) and the **density expectation** (*"typically between 2 and 8"* — it gives the model a prior that fights over-generation).

### User turn, per cluster

```
Issues in this cluster (you may ONLY reference these numbers):

<issue number="12" labels="area:graph,size:M" milestone="M1">
title: Implement Tarjan SCC and cycle breaking
body: |
  ...up to 1500 chars...
</issue>
<issue number="19" ...>
...
</issue>

Already-known dependencies (do not re-emit; treat as ground truth context):
  19 blocked_by 12
```

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
  notes: string                                 // merge suggestions, ambiguities
}
```

---

## Anti-hallucination: five guards

All cheap, all in `validate.ts`. This file is what makes LLM output trustworthy enough to write to GitHub.

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
      // fuzzy second chance: >=0.85 token overlap survives with a confidence haircut
      if (tokenOverlap(norm(e.evidence.quote), hay) >= 0.85) e.confidence -= 0.25;
      else { rejected.push({ e, reason: 'fabricated_evidence' }); continue; }
    }
    // G3 — soft edges never reach GitHub.
    if (e.type === 'ordering_preference') e.writeBack = false;
    // G4 — deterministic layer wins on direction. The LLM cannot flip an explicit
    //      "blocked by" that a human wrote in the issue body.
    if (deterministic.hasReverse(e)) { rejected.push({ e, reason: 'contradicts_explicit' }); continue; }
    kept.push(e);
  }

  // G5 — density cap. Keep the top 1.5 * |cluster| by confidence.
  kept.sort((a, b) => b.confidence - a.confidence);
  const cap = Math.ceil(cluster.length * 1.5);
  rejected.push(...kept.slice(cap).map(e => ({ e, reason: 'density_cap' })));
  return { kept: kept.slice(0, cap), rejected };
}
```

**Surface the rejection counts in the UI and the README.** A line like

> `6 LLM calls · 31 edges proposed · 3 rejected (1 fabricated evidence, 2 density cap) · 0 hallucinated IDs`

is a credibility signal no other team will have.

### Optional L3.5 · Adjudication pass

Only if time allows. For edges in the 0.45–0.75 confidence band, make one call per edge with both issues in full, asking for a yes/no with reasoning. Raises precision meaningfully at roughly $0.05/edge. This is where `claude-opus-5` at `effort: "high"` earns its cost.

---

## L4 · Merge & scoring

```ts
// Independent-evidence combination, then penalties.
score = 1 - Π(1 - c_i)   // over all candidates for the same (blocked, blockedBy)

// Agreement across DISTINCT source layers is stronger than the same layer twice.
if (distinctLayers >= 2) score = Math.min(0.99, score + 0.05);

// Contested: both directions were proposed.
if (reverseExists) { score = Math.max(score, reverse.score) - 0.15; flag('contested'); }
```

Bands:

| Score | Treatment |
|---|---|
| `>= 0.85` | **Recommended accept** — pre-checked in the review UI, still needs a human click |
| `0.50 – 0.85` | **Needs review** — unchecked |
| `< 0.50` | Parked behind a "show low confidence" toggle; kept in `analysis.json` |
| `contested` or cycle-breaking | **Forced review regardless of score** |

---

## The receipt comment

GitHub's dependency API stores no reasoning. When an edge is applied, post this on the blocked issue:

```markdown
🔗 **Dependency recorded:** blocked by #12

> data_contract · confidence 0.91 · inferred by Lattice (claude-opus-5), approved by @handle

**Why:** #23 queries the edges table that #12 defines.
**Evidence:** "returns EdgeCandidate[] from analysis.json" — from #23

<sub>Reasoning is not stored by GitHub's dependency API. This comment is the audit trail.</sub>
```

Free, permanent, and legible to anyone who never runs Lattice.
