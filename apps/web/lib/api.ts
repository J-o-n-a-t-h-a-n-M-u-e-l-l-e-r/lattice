import type { GraphPayload, IssueContext, RunSummary } from '@lattice/types';

/**
 * The web app is a separate service. It holds the backend URL and an API token
 * and nothing else - no database URL, no GitHub token, no model key.
 */
const BASE = process.env.NEXT_PUBLIC_LATTICE_API_URL ?? 'http://localhost:3001';
const TOKEN = process.env.NEXT_PUBLIC_LATTICE_API_TOKEN ?? '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: TOKEN ? { authorization: `Bearer ${TOKEN}` } : {},
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.error ?? res.statusText), { status: res.status, body });
  }
  return res.json() as Promise<T>;
}

export const api = {
  graph: (repo?: string) => get<GraphPayload>(`/graph${repo ? `?repo=${encodeURIComponent(repo)}` : ''}`),
  runs: (repo?: string) => get<RunSummary[]>(`/runs${repo ? `?repo=${encodeURIComponent(repo)}` : ''}`),
  run: (id: string) => get<RunDetail>(`/runs/${id}`),
  issue: (n: number, repo?: string) =>
    get<IssueContext>(`/issues/${n}${repo ? `?repo=${encodeURIComponent(repo)}` : ''}`),
};

export interface RunDetail extends RunSummary {
  rejections: Array<{ blocked: number; blockedBy: number; reason: string; confidence: number | null; rationale: string }>;
  cycleBreaks: GraphPayload['cycleBreaks'];
  belowThreshold: GraphPayload['edges'];
}
