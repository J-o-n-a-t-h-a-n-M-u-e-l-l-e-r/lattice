# [U] App shell, routing, and the design pass
<!-- labels: lane:ui,size:S -->
**What**

Two routes — `/` for the interactive graph, `/runs` for run history — shared layout, navigation, and a single deliberate visual pass: typography, spacing, a restrained palette, and states for loading, empty and error.

**Why it matters**

"Craft" is a scored criterion and this is the cheapest place to earn it. A tool that looks considered reads as finished even when parts are stubbed.

Empty and error states matter more than usual, because a judge running this fresh hits them first. *"No runs yet — the pipeline triggers on issue events, or run `npm run analyze`"* is a better first impression than a blank screen.

Note there is **no `/review`** — the pipeline is unsupervised. `/runs` is the accountability surface instead.

**Scope**

- `apps/web/app/layout.tsx`, route shells, shared components, `apps/web/lib/api.ts`

**Done when**

- [ ] Both routes render with real navigation
- [ ] Loading, empty and error states exist and read well
- [ ] Fetches through the typed REST client — the web app never touches the store or a GitHub token

**Depends on:** the scaffold in #2 and the store interface in #3. It reads the fixture from #4, so it is never blocked on the inference pipeline.
