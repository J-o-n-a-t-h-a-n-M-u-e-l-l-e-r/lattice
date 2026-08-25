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

export const api = {
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
