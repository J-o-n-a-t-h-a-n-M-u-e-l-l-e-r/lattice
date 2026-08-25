'use client';
import { useMemo, useState } from 'react';
import {
  Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphPayload } from '@lattice/types';
import { api } from '../lib/api';
import { connectedSet, layout, partition, reduce } from './graph-layout';
import { IssueNode } from './IssueNode';
import { NodePanel } from './NodePanel';

const nodeTypes = { issue: IssueNode };

export function GraphView({ initial, initialError, repo }: {
  initial: GraphPayload | null;
  initialError: { message: string; status?: number; url: string } | null;
  repo?: string;
}) {
  const [payload, setPayload] = useState<GraphPayload | null>(initial);
  const [error, setError] =
    useState<{ message: string; status?: number; url?: string } | null>(initialError);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [reduced, setReduced] = useState(true);
  const [showIsolated, setShowIsolated] = useState(false);

  const refresh = () => {
    setError(null);
    api.graph(repo)
      .then((p) => { setPayload(p); setError(null); })
      .catch((e) => setError({ message: e.message, status: e.status, url: e.url }));
  };

  const view = useMemo(() => {
    if (!payload) return null;
    // Only blocking edges are drawn. A weak, sub-threshold guess does not
    // deserve a line across the picture - it is in the panel instead.
    let edges = payload.edges.filter((e) => e.blocking);
    if (reduced) edges = reduce(payload.nodes, edges);

    const { connected, isolated } = partition(payload.nodes, edges);
    const focus = hover ?? selected;
    const laid = layout(connected, edges, {
      criticalPath: payload.criticalPath,
      highlight: focus === null ? null : connectedSet(focus, edges),
      selected,
    });
    return { laid, isolated, edgeCount: edges.length };
  }, [payload, reduced, hover, selected]);

  if (error && !payload) {
    const noRun = error.status === 404;
    return (
      <div className="flex-1 grid place-items-center p-8">
        <div className="max-w-lg text-center space-y-3">
          <h2 className="text-lg font-medium">
            {noRun ? 'No analysis yet' : 'Could not reach the backend'}
          </h2>
          <p className="text-[13px] leading-relaxed" style={{ color: '#8b93a7' }}>
            {noRun ? 'The pipeline has not run for this repo yet.' : error.message}
          </p>
          <button onClick={refresh} className="text-[12px] underline" style={{ color: '#8b93a7' }}>
            retry
          </button>
        </div>
      </div>
    );
  }
  if (!payload || !view) {
    return <div className="flex-1 grid place-items-center text-[13px]" style={{ color: '#8b93a7' }}>
      No graph data.
    </div>;
  }

  const { laid, isolated } = view;
  const { stats } = payload;

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 relative min-w-0">
        <ReactFlowProvider>
          <ReactFlow
            nodes={laid.nodes}
            edges={laid.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.12 }}
            minZoom={0.1}
            maxZoom={1.6}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, n) => setSelected(Number(n.id))}
            onNodeMouseEnter={(_, n) => setHover(Number(n.id))}
            onNodeMouseLeave={() => setHover(null)}
            onPaneClick={() => setSelected(null)}
          >
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#1a1f29" />
            <Controls showInteractive={false} position="bottom-right"
                      style={{ background: '#141821', border: '1px solid #2a3140' }} />

            {/* Wave bands, drawn behind the nodes so a row reads as a stage. */}
            {laid.rows.map((r) => (
              <div key={r.wave}
                   className="absolute pointer-events-none text-[11px] uppercase tracking-[0.14em]"
                   style={{
                     transform: `translate(${-laid.width / 2 - 150}px, ${r.y + 4}px)`,
                     color: r.wave === 0 ? '#3fb950' : '#5a6274',
                   }}>
                Wave {r.wave}
                <div className="text-[10px] tracking-normal normal-case mt-0.5"
                     style={{ color: '#4a5261' }}>
                  {r.wave === 0 ? 'start now' : `after wave ${r.wave - 1}`} · {r.count}
                </div>
              </div>
            ))}
          </ReactFlow>
        </ReactFlowProvider>

        {/* Controls */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 rounded-lg border px-3 py-2.5 text-[11px]"
             style={{ borderColor: '#2a3140', background: 'rgba(20,24,33,.94)', backdropFilter: 'blur(8px)' }}>
          <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#8b93a7' }}>
            <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} />
            hide implied edges
          </label>
          {isolated.length > 0 && (
            <label className="flex items-center gap-2 cursor-pointer" style={{ color: '#8b93a7' }}>
              <input type="checkbox" checked={showIsolated}
                     onChange={(e) => setShowIsolated(e.target.checked)} />
              show {isolated.length} independent
            </label>
          )}
        </div>

        {/* Stats */}
        <div className="absolute bottom-3 left-3 z-10 flex gap-4 rounded-lg border px-3 py-2 text-[11px]"
             style={{ borderColor: '#2a3140', background: 'rgba(20,24,33,.94)', backdropFilter: 'blur(8px)' }}>
          {[
            ['issues', stats.issues],
            ['ready', stats.readyCount],
            ['dependencies', view.edgeCount],
            ['waves', stats.waves],
            ['critical path', `${stats.criticalPathDays}d`],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <span style={{ color: '#8b93a7' }}>{k} </span>
              <span className="font-mono">{v}</span>
            </div>
          ))}
        </div>

        {/* Independent issues: real work, but nothing depends on them and they
            depend on nothing. Keeping them out of the DAG is what makes the
            dependency structure legible. */}
        {showIsolated && isolated.length > 0 && (
          <div className="absolute bottom-14 left-3 right-3 z-10 max-h-[30vh] overflow-y-auto rounded-lg border p-3"
               style={{ borderColor: '#2a3140', background: 'rgba(20,24,33,.97)', backdropFilter: 'blur(8px)' }}>
            <div className="text-[11px] mb-2" style={{ color: '#8b93a7' }}>
              {isolated.length} issues with no dependencies — startable in any order
            </div>
            <div className="flex flex-wrap gap-1.5">
              {isolated.map((n) => (
                <button key={n.number} onClick={() => setSelected(n.number)}
                        className="text-[11px] rounded-md border px-2 py-1 text-left max-w-[240px] truncate hover:border-white transition-colors"
                        style={{ borderColor: '#2a3140', background: '#141821' }}>
                  <span className="font-mono" style={{ color: '#8b93a7' }}>#{n.number}</span>{' '}
                  {n.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {selected !== null && (
        <NodePanel number={selected} repo={repo} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
