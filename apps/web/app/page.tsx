import type { GraphPayload } from '@lattice/types';
import { GraphView } from '../components/GraphView';
import { api, apiBase, ApiError } from '../lib/api';

/**
 * Fetched on the server so the first paint has real data: no CORS round trip,
 * no token in the browser bundle, and a failure shows a real message instead
 * of a spinner that never resolves.
 */
export default async function Page({ searchParams }: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const repo = params.repo;

  let payload: GraphPayload | null = null;
  let error: { message: string; status?: number; url: string } | null = null;
  try {
    payload = await api.graph(repo);
  } catch (err) {
    const e = err as ApiError;
    error = { message: e.message, status: e.status, url: e.url ?? apiBase };
  }

  return (
    <main className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <GraphView initial={payload} initialError={error} repo={repo} />
    </main>
  );
}
