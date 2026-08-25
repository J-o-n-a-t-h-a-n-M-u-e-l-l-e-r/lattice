# [M] MCP server route with bearer auth
<!-- labels: lane:mcp,size:M -->
**What**

`apps/backend/src/mcp/server.ts` using `@modelcontextprotocol/sdk`, exposing a Streamable HTTP MCP server authenticated with `LATTICE_MCP_TOKEN`.

**Why it matters**

The server gives local and external agents the derived schedule without exposing direct store access or GitHub credentials.

Use a static bearer token for the server and keep the endpoint limited to scheduling tools.

**Scope**

- `apps/backend/src/mcp/server.ts`
- `apps/backend/src/server.ts`

**Done when**

- [ ] The MCP Inspector connects and lists tools
- [ ] An unauthenticated request is rejected
- [ ] `scripts/agent.ts` completes its local coordination loop

**Depends on:** the scaffold in #2 and the types contract in #1.
