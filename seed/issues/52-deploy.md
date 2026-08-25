# [X] Deploy the app
<!-- labels: lane:demo,size:M -->
**What**

**Two deploys**, because they are two services:

- **Backend** — pipeline, store, REST API, MCP. Needs `DATABASE_URL` (Neon), `OPENROUTER_API_KEY`, the GitHub token, `LATTICE_API_TOKEN`, `COPILOT_MCP_LATTICE_TOKEN`.
- **Web** — Next.js graph UI. Needs exactly two variables: the backend's URL and `LATTICE_API_TOKEN`. No database, no GitHub token, no model key.

Then point the GitHub webhook at the backend's `/api/webhook`, and register the MCP server in repo Settings → Copilot → MCP servers with the backend URL.

**Why it matters**

Three things stop working without a deployment, and all three are scored:

1. **The demo link is a required submission field** and must work for someone outside the team. A localhost screenshot doesn't.
2. **Copilot's cloud agent can only reach an MCP server over public HTTP.** No deploy, no MCP integration — this is also why the stack is TypeScript end to end rather than split across two runtimes.
3. **The webhook needs a public endpoint**, which is what makes the pipeline self-triggering rather than something we run by hand.

Do this **early**, not on the last afternoon. A first deploy always surfaces something — an env var read at build time, a Postgres driver that needs the serverless variant, a route that assumed a filesystem. Finding that at hour six is fine; finding it at hour seventeen is not.

**Scope**

- `vercel.json` if needed, env configuration, webhook setup, MCP registration, deploy notes in the README

**Done when**

- [ ] Web is reachable at a public URL and renders a real graph from the backend
- [ ] The web deploy holds no database or GitHub credentials
- [ ] CORS lets web reach the backend, and nothing else does
- [ ] `DEMO_MODE=1` also works locally from a clean clone with no credentials
- [ ] The webhook fires a run on a real issue event
- [ ] Copilot can reach `/api/mcp` and list tools
- [ ] The URL is in the README and ready for the submission

**Depends on:** the REST API in #53, the graph view in #25, and the MCP route in #30.
