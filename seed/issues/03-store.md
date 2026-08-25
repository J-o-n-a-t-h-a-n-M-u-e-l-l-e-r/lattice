# [F] Snapshot store for `.lattice/`
<!-- labels: lane:foundation,size:S -->
**What**

`src/lib/store.ts` — typed read/write helpers for the four JSON artifacts: `raw.json` (ingest cache), `analysis.json` (proposed edges plus provenance), `decisions.json` (the human approve/reject log), and `leases.json` (agent claims).

Handle the file-missing case gracefully — a fresh clone has none of these. Writes should be atomic (write to a temp file, rename) because the MCP server and the web app can both touch `leases.json`.

**Why it matters**

This is the seam between every workstream. The inference pipeline writes `analysis.json`, the UI reads it, the MCP server reads the schedule derived from it, and the approval flow appends to `decisions.json`.

`decisions.json` is deliberately **committed to git**, unlike the other three. It is the record of a human overruling a model, and it is part of what we submit as evidence of collaboration. Make sure `.gitignore` doesn't swallow it.

**Scope**

- `src/lib/store.ts`

**Done when**

- [ ] All four artifacts have typed read and write helpers
- [ ] Missing files return sensible empty values rather than throwing
- [ ] Writes are atomic
- [ ] `decisions.json` appends rather than overwrites

**Depends on:** the shared types contract in #1 — every helper is typed against it.
