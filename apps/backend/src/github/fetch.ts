import { Octokit } from '@octokit/rest';
import type { Edge, Issue } from '@lattice/types';

/**
 * GitHub is a DATA SOURCE, not a data store. Everything in this file reads.
 * The only write in the whole project is Copilot assignment (copilot.ts).
 */

const API_VERSION = '2026-03-10';

export function octokit(): Octokit {
  const auth = process.env.GITHUB_TOKEN;
  if (!auth) throw new Error('GITHUB_TOKEN is not set');
  return new Octokit({ auth });
}

interface GqlIssue {
  number: number; databaseId: number; id: string; title: string; body: string | null;
  state: 'OPEN' | 'CLOSED'; url: string;
  labels: { nodes: Array<{ name: string }> };
  milestone: { title: string } | null;
}

/**
 * One paginated GraphQL query. `databaseId` is fetched here rather than with N
 * extra calls — it is the stable identifier across renames, where `number` is
 * only what humans see.
 */
export async function fetchIssues(owner: string, repo: string): Promise<Issue[]> {
  const kit = octokit();
  const out: Issue[] = [];
  let cursor: string | null = null;

  for (;;) {
    const res: any = await kit.graphql(
      `query($owner:String!, $repo:String!, $cursor:String) {
         repository(owner:$owner, name:$repo) {
           issues(first:50, after:$cursor, orderBy:{field:CREATED_AT, direction:ASC}) {
             pageInfo { hasNextPage endCursor }
             nodes {
               number databaseId id title body state url
               labels(first:20) { nodes { name } }
               milestone { title }
             }
           }
         }
       }`,
      { owner, repo, cursor },
    );
    const conn = res.repository.issues;
    for (const n of conn.nodes as GqlIssue[]) {
      out.push({
        number: n.number,
        databaseId: n.databaseId,
        nodeId: n.id,
        title: n.title,
        body: n.body ?? '',
        labels: n.labels.nodes.map((l) => l.name),
        milestone: n.milestone?.title ?? null,
        state: n.state === 'OPEN' ? 'open' : 'closed',
        htmlUrl: n.url,
        effortDays: null,
      });
    }
    if (!conn.pageInfo.hasNextPage) break;
    cursor = conn.pageInfo.endCursor;
  }
  return out;
}

/**
 * Native `blocked_by`, read per issue at concurrency 5.
 *
 * These become `given` edges: confidence 1.0, immutable, and the model may not
 * contradict them. Since Lattice never writes to GitHub, this is also the ONLY
 * way information flows toward the repo — a human edits `blocked_by`, and the
 * next run treats it as fact.
 */
export async function fetchGivenEdges(
  owner: string, repo: string, issues: Issue[],
): Promise<Edge[]> {
  const kit = octokit();
  const byDbId = new Map(issues.map((i) => [i.databaseId, i.number]));
  const edges: Edge[] = [];
  const queue = [...issues];

  const worker = async () => {
    for (;;) {
      const issue = queue.shift();
      if (!issue) return;
      try {
        const res = await kit.request(
          'GET /repos/{owner}/{repo}/issues/{issue_number}/dependencies/blocked_by',
          { owner, repo, issue_number: issue.number,
            headers: { 'X-GitHub-Api-Version': API_VERSION } },
        );
        for (const dep of res.data as Array<{ id: number; number: number }>) {
          const blockedBy = byDbId.get(dep.id) ?? dep.number;
          if (blockedBy === undefined) continue;
          edges.push({
            blocked: issue.number, blockedBy,
            type: 'hard_blocker', confidence: 1, source: 'given',
            rationale: 'Recorded in GitHub as a dependency.',
            blocking: true, pinned: false, suppressed: false,
          });
        }
      } catch (err: any) {
        // 404/410 simply means the preview isn't enabled for this repo. Not fatal:
        // an empty `given` set is the normal case, which is the whole premise.
        if (err?.status && ![404, 410, 403].includes(err.status)) throw err;
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  return edges;
}

/** Sub-issue hierarchy: children block the parent's closure. Read-only. */
export async function fetchSubIssueEdges(
  owner: string, repo: string,
): Promise<Edge[]> {
  const kit = octokit();
  try {
    const res: any = await kit.graphql(
      `query($owner:String!, $repo:String!) {
         repository(owner:$owner, name:$repo) {
           issues(first:100, states:[OPEN]) {
             nodes { number subIssues(first:50) { nodes { number } } }
           }
         }
       }`,
      { owner, repo, headers: { 'GraphQL-Features': 'sub_issues' } },
    );
    const edges: Edge[] = [];
    for (const parent of res.repository.issues.nodes) {
      for (const child of parent.subIssues?.nodes ?? []) {
        edges.push({
          blocked: parent.number, blockedBy: child.number,
          type: 'hard_blocker', confidence: 0.99, source: 'sub_issue',
          rationale: `#${child.number} is a sub-issue of #${parent.number}.`,
          blocking: true, pinned: false, suppressed: false,
        });
      }
    }
    return edges;
  } catch {
    // Feature flag unavailable — hierarchy is a bonus signal, never required.
    return [];
  }
}
