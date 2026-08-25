# [U] App shell, routing, and the design pass
<!-- labels: lane:ui,size:S -->
**What**

The two routes (`/` for the graph, `/review` for the approval queue), shared layout, navigation, and a single deliberate visual pass: typography, spacing, a restrained palette, and states for loading, empty, and error.

**Why it matters**

"Craft" is a scored criterion and this is the cheapest place to earn it. A tool that looks considered reads as finished even when parts are stubbed — and the judges explicitly said a half-built thing with clear thinking beats a polished thing with none, which cuts both ways: clear thinking should *look* clear.

Empty and error states matter more than usual here, because a judge running this fresh will hit them first. "No analysis yet — run `npm run analyze`" is a better first impression than a blank screen.

**Scope**

- `app/layout.tsx`, `app/page.tsx` shell, `app/review/page.tsx` shell, shared components

**Done when**

- [ ] Both routes render with real navigation between them
- [ ] Loading, empty, and error states exist and read well
- [ ] Reads `analysis.json`, falling back to the committed fixture

**Depends on:** the scaffold in #2. It reads the fixture from #4, so it is never blocked on the inference pipeline.
