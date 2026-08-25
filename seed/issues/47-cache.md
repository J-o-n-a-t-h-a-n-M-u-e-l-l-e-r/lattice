# [F] The three cache layers
<!-- labels: lane:foundation,size:M -->
**What**

Three distinct caches, described in `docs/11-graph-store.md#caching-in-three-layers`. Don't collapse them — they solve different problems and invalidate differently.

1. **LLM response cache** (`llm_cache`), keyed by a hash of model + system prompt + cluster content. Invalidated by content.
2. **Derived schedule** (`schedule` table) — waves, critical path, blast radius computed once per run. Invalidated by `run_id`.
3. **Read cache** — in-process LRU (~60s TTL) plus `Cache-Control` on read routes. Invalidated by `run_id`.

**Why it matters**

Layer 1 is the one that will save the hackathon. OpenRouter's free tier allows **50 requests a day** (1000 with $10 of credits). During prompt iteration you re-run constantly against unchanged issues; without this cache you burn the day's quota re-deriving identical answers. It also makes demo re-runs instant.

Layer 2 exists because the schedule is computed once per run and read thousands of times. **Never compute waves in a request handler.**

Layer 3 exists because `list_ready_work` is the hot path — five agents polling it should not become fifteen database round-trips.

**Scope**

- `src/store/cache.ts`, cache handling in `src/lib/infer/llm.ts`

**Done when**

- [ ] A repeat run with unchanged issues makes zero model requests
- [ ] The cache survives a process restart
- [ ] `schedule` is written once per run and never recomputed on read
- [ ] A completed run invalidates the read cache
- [ ] Cache hit rate is reported on each run

**Depends on:** the store in #3.
