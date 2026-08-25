# [I] The pipeline runner — CLI and job
<!-- labels: lane:inference,size:M -->
**What**

Orchestrate the whole pipeline: ingest (or cached) → given edges → optional clustering → LLM pass → validate → merge and score → make acyclic → transitive reduction → persist the run → apply to GitHub.

It runs two ways from one implementation: `npx tsx scripts/analyze.ts` for development and the demo, and as the job invoked by the triggers in #48.

Stream progress: `1 request · 31 edges · 3 rejected · 1 cycle · 12 written`.

**Why it matters**

The runner is deliberately **not** a Next.js route. A 60-second LLM pipeline inside a serverless handler is a timeout landmine, and the store boundary is what lets the UI and MCP lanes build against a fixture instead of waiting for us.

The terminal stream is also a demo beat — it's the 15-second mark, and it's what makes the layered pipeline legible to a stranger. Make the output good.

Every run is recorded in the `runs` table with its trigger, request count, edge counts, duration and status. That record is the accountability surface (#50) that replaced the review queue, so it has to be complete — including partial and failed runs.

**Scope**

- `scripts/analyze.ts`, `src/lib/infer/run.ts`

**Done when**

- [ ] End-to-end run persists a complete `runs` row and applies edges
- [ ] Cached mode skips the network entirely
- [ ] A failing cluster degrades to `status: 'partial'` rather than failing the run
- [ ] Progress output is legible enough to demo
- [ ] Request count and token usage are reported

**Depends on:** merge and scoring in #15, cycle-breaking in #18, the store in #3, and write-back in #7.
