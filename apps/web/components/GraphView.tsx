'use client';
import { useMemo, useState } from 'react';
import { Background, BackgroundVariant, Controls, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphPayload } from '@lattice/types';
import { api } from '../lib/api';
import { connectedSet, decorate, layout, partition, reduce } from './graph-layout';
import { GraphToolbar, type ViewOptions } from './GraphToolbar';
import { IssueNode, WaveLabel } from './IssueNode';
import { NodePanel } from './NodePanel';
import { RoutedEdge } from './RoutedEdge';
import { IssueState } from './Octicon';
import { Button } from './ui/button';

const nodeTypes = { issue: IssueNode, waveLabel: WaveLabel };
const edgeTypes = { routed: RoutedEdge };

export function GraphView({ initial, initialError, repo }: {
  initial: GraphPayload | null;
  initialError: { message: string; status?: number; url: string } | null;
  repo: string;
}) {
  const [payload, setPayload] = useState<GraphPayload | null>(initial);
  const [error, setError] =
    useState<{ message: string; status?: number; url?: string } | null>(initialError);
  const [selected, setSelected] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [options, setOptions] = useState<ViewOptions>({ reduced: true, showIsolated: false });

  const reanalyse = async () => {
    setRefreshing(true);
    try {
      await api.startRun(repo);
      const poll = setInterval(async () => {
        const runs = await api.runs(repo).catch(() => null);
        if (runs?.[0] && runs[0].status !== 'running') {
          clearInterval(poll);
          setPayload(await api.graph(repo).catch(() => payload));
          setRefreshing(false);
        }
      }, 2000);
    } catch (e) {
      setError({ message: e instanceof Error ? e.message : String(e) });
      setRefreshing(false);
    }
  };

  // Layout is expensive - sixteen ordering sweeps plus x-assignment - so it
  // runs only when the graph itself changes, never on hover.
  const view = useMemo(() => {
    if (!payload) return null;
    let edges = payload.edges.filter((e) => e.blocking);
    if (options.reduced) edges = reduce(payload.nodes, edges);
    const { connected, isolated } = partition(payload.nodes, edges);
    const laid = layout(connected, edges, { criticalPath: payload.criticalPath });
    return { laid, isolated, edges, edgeCount: edges.length };
  }, [payload, options.reduced]);

  // Hover and selection are styling only: same positions, same identities.
  const display = useMemo(() => {
    if (!view) return null;
    const focus = hover ?? selected;
    return decorate(view.laid, {
      highlight: focus === null ? null : connectedSet(focus, view.edges),
      selected,
    });
  }, [view, hover, selected]);

  if (error && !payload) {
    return (
      <div className="grid flex-1 place-items-center p-8">
        <div className="max-w-md space-y-3 text-center">
          <h2 className="text-lg font-semibold">
            {error.status === 404 ? 'No analysis yet' : 'Could not reach the backend'}
          </h2>
          <p className="text-[13px] leading-relaxed text-muted-foreground">
            {error.status === 404 ? 'The pipeline has not run for this repository yet.' : error.message}
          </p>
          <Button onClick={reanalyse}>Analyse this repository</Button>
        </div>
      </div>
    );
  }
  if (!payload || !view || !display) {
    return <div className="grid flex-1 place-items-center text-[13px] text-muted-foreground">
      No graph data.
    </div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <GraphToolbar
        repo={repo} payload={payload} edgeCount={view.edgeCount}
        isolatedCount={view.isolated.length}
        options={options} onChange={setOptions}
        onRefresh={reanalyse} refreshing={refreshing}
      />

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 bg-canvas">
          <ReactFlowProvider>
            <ReactFlow
              nodes={display.nodes}
              edges={display.edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              // Never zoom out past readable. A wide backlog is pannable;
              // shrinking the cards until the titles are illegible is not a fit.
              fitViewOptions={{ padding: 0.12, minZoom: 0.55, maxZoom: 1 }}
              minZoom={0.1}
              maxZoom={1.6}
              proOptions={{ hideAttribution: true }}
              onNodeClick={(_, n) => setSelected(Number(n.id))}
              onNodeMouseEnter={(_, n) => { const v = Number(n.id); setHover((p) => (p === v ? p : v)); }}
              onNodeMouseLeave={() => setHover((p) => (p === null ? p : null))}
              onPaneClick={() => setSelected(null)}
            >
              <Background variant={BackgroundVariant.Dots} gap={24} size={1}
                          color="hsl(var(--dots))" />
              <Controls showInteractive={false} position="bottom-right"
                        className="!rounded-md !border !border-border !bg-card !shadow-sm
                                   [&_button]:!border-border [&_button]:!bg-card
                                   [&_button]:!fill-foreground [&_button:hover]:!bg-accent" />
            </ReactFlow>
          </ReactFlowProvider>

          {options.showIsolated && view.isolated.length > 0 && (
            <div className="absolute inset-x-4 bottom-4 z-10 max-h-[32vh] overflow-y-auto
                            rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur">
              <p className="mb-2 text-[12px] font-medium text-muted-foreground">
                {view.isolated.length} issues with no dependencies — start any of them
              </p>
              <div className="flex flex-wrap gap-1.5">
                {view.isolated.map((n) => (
                  <button key={n.number} onClick={() => setSelected(n.number)}
                          className="flex max-w-[280px] cursor-pointer items-center gap-1.5 rounded-md
                                     border bg-background px-2 py-1 text-[12px] transition-colors
                                     hover:border-muted-foreground/40 focus-visible:outline-none
                                     focus-visible:ring-2 focus-visible:ring-ring">
                    <IssueState state={n.state} className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{n.title}</span>
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
    </div>
  );
}
