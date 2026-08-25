import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import { defaultRepo } from '../config.js';
import * as tools from './tools.js';

const json = (v: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(v, null, 2) }] });
const repoArg = z.string().optional().describe('owner/name; defaults to the configured repo');

export function buildMcpServer(): McpServer {
  const server = new McpServer(
    { name: 'lattice', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  server.tool(
    'list_ready_work',
    'Issues that can be started right now, ranked by how much they unblock. Returns a human-readable reason per item, not a score.',
    { repo: repoArg, limit: z.number().int().min(1).max(50).optional(), exclude_claimed: z.boolean().optional() },
    async ({ repo, limit, exclude_claimed }) =>
      json(await tools.listReadyWork(repo ?? defaultRepo(), limit ?? 5, exclude_claimed ?? true)),
  );

  server.tool(
    'claim_next_issue',
    'Atomically claim the highest-ranked unclaimed ready issue and get a briefing derived from the graph. Prevents two agents taking the same work.',
    { agent_id: z.string(), repo: repoArg, lease_minutes: z.number().int().optional() },
    async ({ agent_id, repo, lease_minutes }) =>
      json(await tools.claimNextIssue(repo ?? defaultRepo(), agent_id, lease_minutes ?? 45)),
  );

  server.tool(
    'get_issue_context',
    'Blockers, dependents and what those dependents need from you. Read this before starting work.',
    { number: z.number().int(), repo: repoArg },
    async ({ number, repo }) => json(await tools.getIssueContext(repo ?? defaultRepo(), number)),
  );

  server.tool(
    'explain_dependency',
    'Why an edge exists: type, confidence, source and the verbatim quote it was inferred from.',
    { blocked: z.number().int(), blocked_by: z.number().int(), repo: repoArg },
    async ({ blocked, blocked_by, repo }) =>
      json(await tools.explainDependency(repo ?? defaultRepo(), blocked, blocked_by)),
  );

  server.tool(
    'report_progress',
    'Report status on a claimed issue. Returns the graph delta - what your work just unblocked.',
    {
      agent_id: z.string(), number: z.number().int(),
      status: z.enum(['started', 'pr_opened', 'blocked', 'done', 'abandoned']),
      pr_url: z.string().optional(), branch: z.string().optional(),
      note: z.string().optional(), repo: repoArg,
    },
    async ({ agent_id, number, status, pr_url, branch, note, repo }) =>
      json(await tools.reportProgress(repo ?? defaultRepo(), agent_id, number, status, pr_url, branch, note)),
  );

  server.tool(
    'report_dependency',
    'Record a blocker you discovered while working. Goes through the same validation as inferred edges - evidence must be verbatim from an issue.',
    {
      agent_id: z.string(), blocked: z.number().int(), blocked_by: z.number().int(),
      rationale: z.string(), evidence: z.string(), repo: repoArg,
    },
    async ({ agent_id, blocked, blocked_by, rationale, evidence, repo }) =>
      json(await tools.reportDependency(repo ?? defaultRepo(), agent_id, blocked, blocked_by, rationale, evidence)),
  );

  server.tool(
    'plan_for_issue',
    'Everything that must be built before a chosen issue, in dependency order. '
    + 'Start here when you know which issue you want to ship: step 1 needs nothing, '
    + 'each later step only needs what earlier steps produced, and issues within a '
    + 'step are independent of each other.',
    { number: z.number().int().describe('the issue you want to finish'), repo: repoArg },
    async ({ number, repo }) => json(await tools.planForIssue(repo ?? defaultRepo(), number)),
  );

  server.tool(
    'simulate_completion',
    'What becomes ready if these issues were finished? Does not mutate anything.',
    { numbers: z.array(z.number().int()), repo: repoArg },
    async ({ numbers, repo }) => json(await tools.simulateCompletion(repo ?? defaultRepo(), numbers)),
  );

  return server;
}

/** Stateless Streamable HTTP: one transport per request. */
export async function handleMcpRequest(req: any, res: any, body: unknown) {
  const server = buildMcpServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => { void transport.close(); void server.close(); });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}
