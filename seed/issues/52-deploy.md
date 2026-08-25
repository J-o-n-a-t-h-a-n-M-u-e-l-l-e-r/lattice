# [X] Deploy the app
<!-- labels: lane:demo,size:M -->
**What**

Deploy to Vercel with a hosted Postgres (Neon). Wire `OPENROUTER_API_KEY`, the GitHub token, `COPILOT_MCP_LATTICE_TOKEN`, and the database URL. Point the GitHub webhook at the deployed `/api/webhook`. Register the MCP server in repo Settings → Copilot → MCP servers with the deployed URL.

**Why it matters**

Three things stop working without a deployment, and all three are scored:

1. **The demo link is a required submission field** and must work for someone outside the team. A localhost screenshot doesn't.
2. **Copilot's cloud agent can only reach an MCP server over public HTTP.** No deploy, no MCP integration — this is also why the stack is TypeScript end to end rather than split across two runtimes.
3. **The webhook needs a public endpoint**, which is what makes the pipeline self-triggering rather than something we run by hand.

Do this **early**, not on the last afternoon. A first deploy always surfaces something — an env var read at build time, a Postgres driver that needs the serverless variant, a route that assumed a filesystem. Finding that at hour six is fine; finding it at hour seventeen is not.

**Scope**

- `vercel.json` if needed, env configuration, webhook setup, MCP registration, deploy notes in the README

**Done when**

- [ ] The app is reachable at a public URL and renders a real graph
- [ ] `DEMO_MODE=1` also works locally from a clean clone with no credentials
- [ ] The webhook fires a run on a real issue event
- [ ] Copilot can reach `/api/mcp` and list tools
- [ ] The URL is in the README and ready for the submission

**Depends on:** the store in #3, the graph view in #25, and the MCP route in #30.
