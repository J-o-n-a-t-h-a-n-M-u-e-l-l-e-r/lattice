import type { GraphPayload, IssueContext, RunSummary } from '@lattice/types';

/**
 * The web app is a separate service. It holds the backend URL and an API token
 * and nothing else - no database URL, no GitHub token, no model key.
 *
 * NEXT_PUBLIC_* is inlined at build time and visible in the browser bundle, so
 * the token is read from the server-only var when we fetch on the server.
 */
const BASE = process.env.NEXT_PUBLIC_LATTICE_API_URL ?? 'http://localhost:3001';
const TOKEN = process.env.LATTICE_API_TOKEN ?? process.env.NEXT_PUBLIC_LATTICE_API_TOKEN ?? '';

export class ApiError extends Error {
  constructor(message: string, readonly status: number | undefined, readonly url: string) {
    super(message);
  }
}

async function get<T>(path: string): Promise<T> {
  const url = `${BASE}/api${path}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: TOKEN ? { authorization: `Bearer ${TOKEN}` } : {},
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    // Network-level: backend down, wrong port, DNS. Say which URL failed -
    // "Loading..." forever is the worst possible version of this.
    throw new ApiError(
      err instanceof Error && err.name === 'TimeoutError'
        ? `Timed out after 15s calling ${url}`
        : `Could not reach ${url}`,
      undefined, url);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError((body as any).detail ?? (body as any).error ?? res.statusText, res.status, url);
  }
  return res.json() as Promise<T>;
}

export interface RepoRow {
  repo: string; issues: number; latestRunId: string | null; updatedAt: string | null;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const url = `${BASE}/api${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(TOKEN ? { authorization: `Bearer ${TOKEN}` } : {}) },
    body: JSON.stringify(body),
    cache: 'no-store',
  }).catch(() => { throw new ApiError(`Could not reach ${url}`, undefined, url); });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((json as any).detail ?? (json as any).error ?? res.statusText, res.status, url);
  return json as T;
}

export interface PlanIssue {
  number: number; title: string; url: string; state: 'open' | 'closed';
  effort_days: number; unblocks: number[]; why: string; on_critical_path: boolean;
}
export interface BuildPlan {
  target: { number: number; title: string; url: string; state: string };
  ready: boolean;
  steps: Array<{ step: number; parallel: number; issues: PlanIssue[] }>;
  total_prerequisites: number;
  remaining_prerequisites: number;
  already_done: number[];
  remaining_effort_days: number;
  critical_path_days: number;
  notes?: string;
}

export const api = {
  repos: () => get<RepoRow[]>('/repos'),
  plan: (n: number, repo?: string) =>
    get<BuildPlan>(`/plan/${n}${repo ? `?repo=${encodeURIComponent(repo)}` : ''}`),
  startRun: (repo: string) =>
    post<{ runId: string; repo: string; status: string; existing?: boolean }>('/runs', { repo }),
  graph: (repo?: string) =>
    get<GraphPayload>(`/graph${repo ? `?repo=${encodeURIComponent(repo)}` : ''}`),
  runs: (repo?: string) =>
    get<RunSummary[]>(`/runs${repo ? `?repo=${encodeURIComponent(repo)}` : ''}`),
  run: (id: string) => get<RunDetail>(`/runs/${id}`),
  issue: (n: number, repo?: string) =>
    get<IssueContext>(`/issues/${n}${repo ? `?repo=${encodeURIComponent(repo)}` : ''}`),
};

export const apiBase = BASE;

export interface RunDetail extends RunSummary {
  rejections: Array<{ blocked: number; blockedBy: number; reason: string; confidence: number | null; rationale: string }>;
  cycleBreaks: GraphPayload['cycleBreaks'];
  belowThreshold: GraphPayload['edges'];
}
