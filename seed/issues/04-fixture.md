# [F] Hand-write the store fixture
<!-- labels: lane:foundation,size:S -->
**What**

A realistic, hand-authored fixture behind the `GraphStore` interface: roughly 20 issues, ~15 edges spanning all four dependency types, confidence values from 0.3 to 0.98, at least one contested pair, some edges below the write threshold, a few validator rejections, and **one cycle the pipeline broke** so the run view has something to render.

Commit it. It is not throwaway.

**Why it matters**

The single most important scheduling decision in the plan. The UI and MCP workstreams build against this from hour one and **never wait for the inference pipeline**. Without it, two of five people idle for half a day.

It is also the backing data for `DEMO_MODE=1` (#41), which is what lets a judge with no database, no GitHub token and no OpenRouter key see the entire app — a directly scored criterion.

Make it *realistic*, including the ugly parts. A fixture where every edge is confident and nothing was rejected will quietly shape the UI into something that can't display the real thing.

**Scope**

- `src/store/fixtures.ts` and the committed JSON it reads

**Done when**

- [ ] Satisfies the `GraphStore` interface with no database running
- [ ] Contains all four `DependencyType` values
- [ ] Contains a broken cycle with victim and alternatives recorded
- [ ] Contains rejections across at least two reasons
- [ ] Contains sub-threshold edges that schedule but were never written
- [ ] The UI renders it without special-casing

**Depends on:** the types contract in #1 and the store interface in #3. Nothing else — that's the point of it.
