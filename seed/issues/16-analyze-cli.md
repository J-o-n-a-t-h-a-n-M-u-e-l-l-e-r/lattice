# [I] `scripts/analyze.ts` — the pipeline orchestrator
<!-- labels: lane:inference,size:M -->
**What**

The CLI that runs the whole pipeline: ingest (or `--cached`) → deterministic extraction → candidate clustering → LLM pass (skippable with `--no-llm`) → validate → merge → cycle-break → write `.lattice/analysis.json`.

It should stream progress to the terminal as it goes: `18 deterministic signals · 61 candidate pairs · 5 LLM calls · 31 edges · 3 rejected · 1 cycle`.

**Why it matters**

Deliberately a CLI and **not** a Next.js route. Three reasons: a 60-second LLM pipeline inside a serverless handler is a timeout landmine; the artifact-on-disk boundary is what lets the UI and MCP workstreams build against a fixture instead of waiting for us; and a CLI is resumable, cacheable, and demoable in a terminal.

That terminal stream is itself a demo beat — it's the 15-second mark in the script, and it's what makes the layered pipeline legible to a stranger. Make the output good.

`--no-llm` must produce a valid graph from deterministic signals alone. That's our fallback and it needs to keep working.

**Scope**

- `scripts/analyze.ts`

**Done when**

- [ ] End-to-end run produces a valid `analysis.json`
- [ ] `--cached` skips the network entirely
- [ ] `--no-llm` produces a valid graph with no API key set
- [ ] Progress output is legible enough to demo
- [ ] Cost and token counts are reported at the end

**Depends on:** merge and scoring in #15, the cycle-breaking in #18, and the store helpers in #3.
