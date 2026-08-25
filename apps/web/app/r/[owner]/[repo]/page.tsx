import type { GraphPayload } from '@lattice/types';
import { GraphView } from '../../../../components/GraphView';
import { RunProgress } from '../../../../components/RunProgress';
import { api, ApiError, apiBase } from '../../../../lib/api';

export const dynamic = 'force-dynamic';

export default async function RepoPage({ params }: {
  params: Promise<{ owner: string; repo: string }>;
}) {
  const { owner, repo: name } = await params;
  const repo = `${owner}/${name}`;

  let payload: GraphPayload | null = null;
  let error: { message: string; status?: number; url: string } | null = null;
  try {
    payload = await api.graph(repo);
  } catch (err) {
    const e = err as ApiError;
    error = { message: e.message, status: e.status, url: e.url ?? apiBase };
  }

  // No graph yet: either the first run is still going, or nothing has run.
  // Either way the honest thing is to show progress, not an empty canvas.
  if (!payload) {
    return <RunProgress repo={repo} unreachable={error?.status === undefined} />;
  }

  return (
    <main className="flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
      <div className="flex items-center gap-3 px-5 py-2 border-b text-[12px]"
           style={{ borderColor: '#2a3140' }}>
        <a href={`https://github.com/${repo}`} target="_blank" rel="noreferrer"
           className="font-medium hover:underline">{repo}</a>
        <span style={{ color: '#5a6274' }}>
          {payload.stats.issues} open · {payload.stats.readyCount} startable now
        </span>
      </div>
      <GraphView initial={payload} initialError={null} repo={repo} />
    </main>
  );
}
