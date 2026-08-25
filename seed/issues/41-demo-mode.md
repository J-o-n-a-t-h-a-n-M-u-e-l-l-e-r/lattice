# [X] `DEMO_MODE=1` fixture path
<!-- labels: lane:demo,size:M -->
**What**

An environment flag that binds `GraphStore` to committed fixtures: no database, no `GITHUB_TOKEN`, no `OPENROUTER_API_KEY`, no Copilot seat. Graph view, run history, MCP responses — all from committed JSON. Write actions become no-ops that show what they *would* send.

**Why it matters**

**The single highest-ROI hour in the plan.** The Craft criterion is stated as *"Does it work? Can someone else run it from your README?"* — and the honest answer for most hackathon projects is no, because the judge doesn't have the credentials.

`git clone && npm install && DEMO_MODE=1 npm run dev` and they see everything. That converts a criterion we'd otherwise partly fail into one we pass outright.

It also makes our own development faster and gives us a demo that cannot fail from a network problem on stage.

**Scope**

- `src/store/fixtures.ts`, env handling at entrypoints, README quickstart

**Done when**

- [ ] Works with an empty `.env` and no database running
- [ ] Every screen renders with realistic data, including rejections and a broken cycle
- [ ] MCP tools respond from fixtures
- [ ] Write actions show intent rather than failing
- [ ] Documented as the first quickstart path in the README

**Depends on:** the store interface in #3, the fixture in #4, and the graph view in #25.
