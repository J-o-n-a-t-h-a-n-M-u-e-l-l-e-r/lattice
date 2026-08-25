# [M] MCP server route with bearer auth
<!-- labels: lane:mcp,size:M -->
**What**

`app/api/mcp/[transport]/route.ts` using `@modelcontextprotocol/sdk` and `mcp-handler`, exposing a Streamable HTTP MCP server. Bearer auth from `COPILOT_MCP_LATTICE_TOKEN`. Tools only — Copilot ignores resources and prompts.

**Why it matters**

This has to be an HTTP endpoint Copilot's cloud agent can actually reach, which is a large part of why the whole project is TypeScript rather than split across two languages: one deployable, one auth story, no proxy.

Constraints that will bite if not read up front: no OAuth for remote MCP servers, so plan a static bearer token; secret names must start with `COPILOT_MCP_`; and the `tools` allowlist in the repo's MCP configuration is required — an omitted tool is simply invisible to the agent.

Verify with `npx @modelcontextprotocol/inspector` before wiring Copilot to it.

**Scope**

- `app/api/mcp/[transport]/route.ts`

**Done when**

- [ ] The inspector connects and lists tools
- [ ] Bearer auth rejects an unauthenticated request
- [ ] Claude Code can connect to it locally
- [ ] The repo MCP configuration JSON is documented in the README

**Depends on:** the scaffold in #2 and the types contract in #1.
