'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  Background, BackgroundVariant, Controls, MiniMap, ReactFlow, ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphPayload } from '@lattice/types';
import { api } from '../lib/api';
import { buildFlow, connectedSet, reduce } from './graph-layout';
import { IssueNode } from './IssueNode';
import { NodePanel } from './NodePanel';

const nodeTypes = { issue: IssueNode };

function Legend({ reduced, setReduced, showSoft, setShowSoft }: {
  reduced: boolean; setReduced: (v: boolean) => void;
  showSoft: boolean; setShowSoft: (v: boolean) => void;
}) {
  return (
    <div className="absolute top-3 right-3 z-10 rounded-lg border px-3 py-2.5 space-y-2 text-[11px]"
         style={{ borderColor: 'var(--line)', background: 'rgba(18,21,29,.92)', backdropFilter: 'blur(6px)' }}>
      <div className="flex flex-col gap-1.5">
        {[
          ['hard blocker', '#f0883e'],
          ['data contract', '#58a6ff'],
          ['shared artifact', '#bc8cff'],
        ].map(([label, color]) => (
          <div key={label} className="flex items-center gap-2" style={{ color: 'var(--muted)' }}>
            <span style={{ width: 16, height: 2, background: color, display: 'inline-block' }} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-2" style={{ color: 'var(--muted)' }}>
          <span style={{ width: 16, borderTop: '2px dashed #6b7280', display: 'inline-block' }} />
          non-blocking
        </div>
      </div>
      <div className="pt-2 space-y-1.5 border-t" style={{ borderColor: 'var(--line)' }}>
        <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--muted)' }}>
          <input type="checkbox" checked={reduced} onChange={(e) => setReduced(e.target.checked)} />
          hide implied edges
        </label>
        <label className="flex items-center gap-2 cursor-pointer" style={{ color: 'var(--muted)' }}>
          <input type="checkbox" checked={showSoft} onChange={(e) => setShowSoft(e.target.checked)} />
          show non-blocking
        </label>
      </div>
    </div>
  );
}

export function GraphView({ repo }: { repo?: string }) {
  const [payload, setPayload] = useState<GraphPayload | null>(null);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [reduced, setReduced] = useState(true);
  const [showSoft, setShowSoft] = useState(true);

  useEffect(() => {
    api.graph(repo).then(setPayload).catch((e) => setError({ message: e.message, status: e.status }));
  }, [repo]);

  const flow = useMemo(() => {
    if (!payload) return null;
    let edges = showSoft ? payload.edges : payload.edges.filter((e) => e.blocking);
    if (reduced) {
      const blocking = edges.filter((e) => e.blocking);
      const soft = edges.filter((e) => !e.blocking);
      edges = [...reduce(payload.nodes, blocking), ...soft];
    }
    const focus = hover ?? selected;
    return buildFlow(payload.nodes, edges, {
      criticalPath: payload.criticalPath,
      highlight: focus === null ? null : connectedSet(focus, edges),
      selected,
    });
  }, [payload, reduced, showSoft, hover, selected]);

  if (error) {
    return (
      <div className="flex-1 grid place-items-center p-8">
        <div className="max-w-md text-center space-y-3">
          <h2 className="text-lg font-medium">
            {error.status === 404 ? 'No analysis yet' : 'Could not reach the backend'}
          </h2>
          <p className="text-[13px] leading-relaxed" style={{ color: 'var(--muted)' }}>
            {error.status === 404
              ? 'The pipeline has not run for this repo yet. Run npm run analyze, or trigger it by editing an issue.'
              : error.message}
          </p>
          <code className="block text-[12px] rounded px-3 py-2 font-mono"
                style={{ background: 'var(--panel)', color: 'var(--accent)' }}>
            npm run analyze
          </code>
        </div>
      </div>
    );
  }

  if (!payload || !flow) {
    return <div className="flex-1 grid place-items-center text-[13px]" style={{ color: 'var(--muted)' }}>
      Loading graph…
    </div>;
  }

  const { stats } = payload;

  return (
    <div className="flex flex-1 min-h-0">
      <div className="flex-1 relative min-w-0">
        {/* Wave column headers — what makes this read as a schedule, not a hairball. */}
        <div className="absolute inset-x-0 top-0 z-10 flex gap-1 px-4 py-2 pointer-events-none">
          {flow.waveBounds.map((w) => (
            <div key={w.wave} style={{ width: 380 }}
                 className="text-[11px] uppercase tracking-wider" >
              <span style={{ color: w.wave === 0 ? 'var(--ready)' : 'var(--muted)' }}>
                Wave {w.wave}
              </span>
              <span style={{ color: 'var(--muted)' }}>
                {w.wave === 0 ? ' · ready now' : ''} ({w.count})
              </span>
            </div>
          ))}
        </div>

        <Legend reduced={reduced} setReduced={setReduced} showSoft={showSoft} setShowSoft={setShowSoft} />

        <ReactFlowProvider>
          <ReactFlow
            nodes={flow.nodes}
            edges={flow.edges}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.15}
            maxZoom={1.8}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_, n) => setSelected(Number(n.id))}
            onNodeMouseEnter={(_, n) => setHover(Number(n.id))}
            onNodeMouseLeave={() => setHover(null)}
            onPaneClick={() => setSelected(null)}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color="#1b2029" />
            <Controls showInteractive={false}
                      style={{ background: 'var(--panel)', borderColor: 'var(--line)' }} />
            <MiniMap pannable zoomable
                     style={{ background: 'var(--panel)', border: '1px solid var(--line)' }}
                     maskColor="rgba(11,13,18,.75)"
                     nodeColor={(n) => {
                       const d = n.data as any;
                       return d.onCritical ? '#f0883e' : d.node.ready ? '#3fb950' : '#39404f';
                     }} />
          </ReactFlow>
        </ReactFlowProvider>

        <div className="absolute bottom-3 left-3 z-10 flex gap-4 rounded-lg border px-3 py-2 text-[11px]"
             style={{ borderColor: 'var(--line)', background: 'rgba(18,21,29,.92)', backdropFilter: 'blur(6px)' }}>
          {[
            ['issues', stats.issues],
            ['ready', stats.readyCount],
            ['edges', `${stats.blockingEdges}/${stats.edges}`],
            ['waves', stats.waves],
            ['critical path', `${stats.criticalPathDays}d`],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <span style={{ color: 'var(--muted)' }}>{k} </span>
              <span className="font-mono">{v}</span>
            </div>
          ))}
        </div>
      </div>

      {selected !== null && (
        <NodePanel number={selected} repo={repo} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
