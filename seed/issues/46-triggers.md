# [I] Automatic triggers — webhook, schedule, debounce
<!-- labels: lane:inference,size:M -->
**What**

Make the pipeline run itself. Four entry points:

| Trigger | Behaviour |
|---|---|
| `issues` webhook — opened, edited, closed, reopened, labeled | Debounce ~60s so an editing spree is one run |
| Hourly scheduled Action | Backstop for missed or dropped events |
| `workflow_dispatch` | Manual re-run, for the demo |
| `report_progress` from an agent | A completion changes the ready set immediately |

Plus **incremental re-inference**: if one issue changed, re-infer only the clusters containing it and re-run the graph maths, which needs no model call at all. Full re-inference is the fallback, not the default.

**Why it matters**

This is what makes Lattice a system rather than a script. **Nobody runs it** — that's the pitch and it's the 0:15 demo beat: edit an issue on GitHub, watch the graph update itself.

Debouncing is not a nicety. Without it, closing five issues in a row fires five full runs, and the free-tier quota is 50 requests a day.

Incremental matters for the same reason. Graph maths is microseconds; the model call is the scarce resource. If nothing textual changed, don't spend one.

Guard against overlapping runs — a run in flight should cause the next trigger to coalesce, not to start a second concurrent write to the store.

**Scope**

- `app/api/webhook/route.ts`, `.github/workflows/lattice.yml`, `src/lib/infer/trigger.ts`

**Done when**

- [ ] A webhook event starts a run and the graph updates with no human action
- [ ] Rapid successive events coalesce into one run
- [ ] Overlapping runs are prevented
- [ ] Unchanged issues do not trigger a model call
- [ ] The scheduled backstop works and is visible in `runs`
- [ ] Webhook signatures are verified

**Depends on:** the pipeline runner in #16 and the store in #3.
